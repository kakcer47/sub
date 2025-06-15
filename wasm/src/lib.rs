use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{to_value, from_value};
use std::collections::HashMap;
use lz4_flex::{compress_prepend_size, decompress_size_prepended};

// Логирование в консоль
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// Компактная структура поста (40 байт)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[repr(C, packed)]
pub struct CompactPost {
    pub id: u32,
    pub creator_id: u32,
    pub title_hash: u32,
    pub description_hash: u32,
    pub timestamp: u32,
    pub likes_count: u16,
    pub city_id: u8,
    pub gender_id: u8,
    pub type_flags: u16,
    pub meta_flags: u16,
}

// Полная структура для UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FullPost {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub city: Option<String>,
    pub types: Vec<String>,
    pub gender: Option<String>,
    pub date: Option<String>,
    pub creator_id: u32,
    pub creator_name: String,
    pub creator_username: String,
    pub creator_avatar: Option<String>,
    pub liked_by: Vec<u32>,
    pub created_at: String,
}

// Структура для хранения и управления постами
pub struct PostIndex {
    posts: Vec<CompactPost>,
    index: HashMap<u32, usize>,
}

impl PostIndex {
    pub fn new() -> Self {
        PostIndex {
            posts: Vec::new(),
            index: HashMap::new(),
        }
    }

    // Добавить пост
    pub fn add_post(&mut self, post: CompactPost) {
        let id = post.id;
        let index = self.posts.len();
        self.posts.push(post);
        self.index.insert(id, index);
    }

    // Получить пост по ID
    pub fn get_post(&self, id: u32) -> Option<&CompactPost> {
        self.index.get(&id).map(|&i| &self.posts[i])
    }

    // Обновить лайк для поста
    pub fn update_like(&mut self, post_id: u32, user_id: u32) -> bool {
        if let Some(post) = self.index.get(&post_id).map(|&i| &mut self.posts[i]) {
            post.likes_count = if post.likes_count > 0 {
                post.likes_count - 1
            } else {
                post.likes_count + 1
            };
            let likes = post.likes_count; // Копируем значение для избежания UB
            console_log!("❤️ Updated like for post: {}, user: {}, likes: {}", post_id, user_id, likes);
            true
        } else {
            false
        }
    }

    // Фильтрация постов по city_id
    pub fn filter_by_city(&self, city_id: u8) -> Vec<&CompactPost> {
        self.posts.iter().filter(|post| post.city_id == city_id).collect()
    }

    // Получить все посты
    pub fn get_all(&self) -> &[CompactPost] {
        &self.posts
    }

    // Количество постов
    pub fn len(&self) -> usize {
        self.posts.len()
    }

    // Заменить все посты
    pub fn replace_all(&mut self, new_posts: Vec<CompactPost>) {
        self.posts = new_posts;
        self.index.clear();
        for (i, post) in self.posts.iter().enumerate() {
            self.index.insert(post.id, i);
        }
    }
}

// Хеширование строк
fn hash_string(s: &str) -> u32 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    (hasher.finish() & 0xFFFFFFFF) as u32
}

#[wasm_bindgen]
pub struct WasmEngine {
    #[allow(dead_code)]
    ws_url: String,
    string_pool: HashMap<u32, String>,
    post_storage: PostIndex,
    string_cache: HashMap<u32, String>, // Локальный кэш строк
}

#[wasm_bindgen]
impl WasmEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(ws_url: String) -> WasmEngine {
        console_log!("🚀 WASM Engine initialized");
        WasmEngine {
            ws_url,
            string_pool: HashMap::new(),
            post_storage: PostIndex::new(),
            string_cache: HashMap::new(),
        }
    }

    // Создание поста
    #[wasm_bindgen]
    pub fn create_post(&mut self, post_data: &JsValue) -> Result<JsValue, JsValue> {
        let full_post: FullPost = from_value(post_data.clone())
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

        console_log!("📝 Creating post: {}", full_post.title);

        let compact = CompactPost {
            id: full_post.id,
            creator_id: full_post.creator_id,
            title_hash: {
                let hash = hash_string(&full_post.title);
                self.string_pool.insert(hash, full_post.title.clone());
                hash
            },
            description_hash: {
                let hash = hash_string(&full_post.description);
                self.string_pool.insert(hash, full_post.description.clone());
                hash
            },
            timestamp: chrono::Utc::now().timestamp() as u32,
            likes_count: full_post.liked_by.len() as u16,
            city_id: 0,
            gender_id: 0,
            type_flags: 0,
            meta_flags: 0,
        };

        self.post_storage.add_post(compact.clone());
        let result = self.compact_to_full(&compact)?;
        
        Ok(to_value(&result).unwrap())
    }

    // Получение всех постов
    #[wasm_bindgen]
    pub fn get_posts(&mut self) -> Result<JsValue, JsValue> {
        console_log!("📄 Getting posts, count: {}", self.post_storage.len());
        
        // Клонируем посты, чтобы избежать конфликта заимствований
        let posts: Vec<CompactPost> = self.post_storage.get_all().iter().cloned().collect();
        let full_posts: Vec<FullPost> = posts
            .into_iter()
            .filter_map(|compact| self.compact_to_full(&compact).ok())
            .collect();

        Ok(to_value(&full_posts).unwrap())
    }

    // Лайк поста
    #[wasm_bindgen]
    pub fn toggle_like(&mut self, post_id: u32, user_id: u32) -> Result<JsValue, JsValue> {
        console_log!("❤️ Toggle like for post: {}, user: {}", post_id, user_id);
        
        if self.post_storage.update_like(post_id, user_id) {
            self.get_posts()
        } else {
            Err(JsValue::from_str(&format!("Post {} not found", post_id)))
        }
    }

    // Сжатие данных для отправки по сети
    #[wasm_bindgen]
    pub fn compress_posts(&self) -> Vec<u8> {
        let serialized = bincode::serialize(&self.post_storage.get_all()).unwrap();
        compress_prepend_size(&serialized)
    }

    // Распаковка данных из сети
    #[wasm_bindgen]
    pub fn decompress_posts(&mut self, data: &[u8]) -> Result<JsValue, JsValue> {
        let decompressed = decompress_size_prepended(data)
            .map_err(|e| JsValue::from_str(&format!("Decompress error: {}", e)))?;
        
        let posts: Vec<CompactPost> = bincode::deserialize(&decompressed)
            .map_err(|e| JsValue::from_str(&format!("Parse error: {}", e)))?;

        self.post_storage.replace_all(posts);
        self.get_posts()
    }

    // Конвертация компактного поста в полный
    fn compact_to_full(&mut self, compact: &CompactPost) -> Result<FullPost, JsValue> {
        // Копируем поля для избежания неравномерного доступа
        let title_hash = compact.title_hash;
        let description_hash = compact.description_hash;

        let title = self.string_cache
            .get(&title_hash)
            .cloned()
            .unwrap_or_else(|| {
                let title = self.string_pool.get(&title_hash)
                    .cloned()
                    .unwrap_or_else(|| "Unknown".to_string());
                self.string_cache.insert(title_hash, title.clone());
                title
            });

        let description = self.string_cache
            .get(&description_hash)
            .cloned()
            .unwrap_or_else(|| {
                let desc = self.string_pool.get(&description_hash)
                    .cloned()
                    .unwrap_or_else(|| "Unknown".to_string());
                self.string_cache.insert(description_hash, desc.clone());
                desc
            });

        Ok(FullPost {
            id: compact.id,
            title,
            description,
            city: Some("Moscow".to_string()),
            types: vec!["General".to_string()],
            gender: Some("All".to_string()),
            date: None,
            creator_id: compact.creator_id,
            creator_name: "User".to_string(),
            creator_username: "username".to_string(),
            creator_avatar: None,
            liked_by: vec![],
            created_at: chrono::DateTime::from_timestamp(compact.timestamp as i64, 0)
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| "Unknown".to_string()),
        })
    }
}

// Инициализация модуля
#[wasm_bindgen(start)]
pub fn main() {
    console_log!("🦀 WASM модуль успешно загружен");
}