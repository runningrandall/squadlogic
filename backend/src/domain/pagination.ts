export interface ListOptions {
  cursor?: string;
  limit?: number;
}

export interface ListResult<T> {
  items: T[];
  cursor?: string;
}
