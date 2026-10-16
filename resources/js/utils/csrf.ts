/**
 * Enhanced CSRF token helper for Laravel + Inertia.js
 */

export function getCsrfToken(): string | null {
  // 1. Try to get from meta tag (most up-to-date)
  if (typeof document !== 'undefined') {
    const metaToken = document.head.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    if (metaToken && metaToken.content) {
      return metaToken.content;
    }
  }

  // 2. Try to get from Inertia's page props
  if (typeof window !== 'undefined' && (window as any).page?.props?.csrf_token) {
    return (window as any).page.props.csrf_token;
  }

  // 3. Fallback: Parse XSRF-TOKEN cookie from document.cookie
  if (typeof document !== 'undefined' && document.cookie) {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }

  return null;
}

/**
 * Synchronize a new CSRF token across meta tag, window.page, and axios headers
 */
export function syncCsrfToken(newToken: string): void {
  if (!newToken) return;

  // Update meta tag
  if (typeof document !== 'undefined') {
    let meta = document.head.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'csrf-token');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', newToken);
  }

  // Update window.page props
  if (typeof window !== 'undefined' && (window as any).page?.props) {
    (window as any).page.props.csrf_token = newToken;
  }

  // Update axios default headers
  if (typeof window !== 'undefined' && (window as any).axios) {
    (window as any).axios.defaults.headers.common['X-CSRF-TOKEN'] = newToken;
  }
}

/**
 * Fetch a fresh CSRF token from the server and synchronize it
 */
export async function refreshCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/csrf-token', {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'same-origin',
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.csrf_token) {
        syncCsrfToken(data.csrf_token);
        return data.csrf_token;
      }
    }
  } catch (error) {
    console.debug('Failed to refresh CSRF token:', error);
  }

  return null;
}