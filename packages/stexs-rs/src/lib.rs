use reqwest;

// just random code
pub struct Client {
    base_url: String,
    client: reqwest::Client,
}

impl Client {
    pub fn new(base_url: &str) -> Result<Self, reqwest::Error> {
        Ok(ApiClient {
            base_url: base_url.to_string(),
            client: reqwest::Client::new(),
        })
    }

    pub fn make_request(&self, endpoint: &str) -> Result<reqwest::Response, reqwest::Error> {
        let url = format!("{}/{}", self.base_url, endpoint);
        self.client.get(&url).send()
    }
}
