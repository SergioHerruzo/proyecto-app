import { fetchAuthSession } from '@aws-amplify/auth';
let baseURL = '';
export function configureAPI(url) {
    baseURL = url;
}
export async function apiClient(endpoint, options = {}) {
    if (!baseURL)
        throw new Error('API no configurada. Llama a configureAPI() primero');
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    const response = await fetch(`${baseURL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });
    if (!response.ok)
        throw new Error(`Error: ${response.status}`);
    return response.json();
}
//# sourceMappingURL=api.js.map