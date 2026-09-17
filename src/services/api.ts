const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://dinh-coffee.onrender.com/api";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Render free tier "ngủ" sau ~15 phút không có request — lần gọi đầu tiên
// sau đó có thể timeout/network-error (không phải lỗi HTTP, nên không có
// res.ok để bắt) trong lúc server đang khởi động lại (~30-50s). Thử lại
// một lần sau khoảng nghỉ ngắn trước khi báo lỗi hẳn cho người dùng.
async function request<T>(
  path: string,
  init?: RequestInit,
  attempt = 0,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (err) {
    if (attempt < 1) {
      await delay(2000);
      return request<T>(path, init, attempt + 1);
    }
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.message ?? "Yêu cầu thất bại");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string) {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}
