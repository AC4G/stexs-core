export async function request(url: string, method: string = 'GET', body: object | null = null, headers: object | null = null) {
    return (await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify(body)
    })).json();
}
