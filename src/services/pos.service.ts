import api from './api';
import { ApiResponse, Meta, Product, ProductSortBy } from '../types';

export interface ProductsResult {
  products: Product[];
  meta: Meta;
}

export interface ListProductsParams {
  category?: string;
  search?: string;
  sortBy?: ProductSortBy;
  page?: number;
  limit?: number;
}

export const getProducts = async (params: ListProductsParams = {}): Promise<ProductsResult> => {
  const res = await api.get<ApiResponse<{ products: Product[] }>>('/member/products', {
    params,
  });
  if (!res.data.success || !res.data.data) throw new Error('Failed to fetch products');
  return {
    products: res.data.data.products,
    meta: res.data.meta ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: 0,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };
};

export const getProduct = async (id: string): Promise<Product> => {
  const res = await api.get<ApiResponse<{ product: Product }>>(`/member/products/${id}`);
  if (!res.data.success || !res.data.data) throw new Error('Product not found');
  return res.data.data.product;
};
