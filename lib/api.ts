import { fetch } from "expo/fetch";
import { Platform } from "react-native";

const API_BASE = "https://appmyjantes.mytoolsgroup.eu";

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

let sessionCookie: string | null = null;

export function setSessionCookie(cookie: string | null) {
  sessionCookie = cookie;
}

export function getSessionCookie() {
  return sessionCookie;
}

export async function apiCall<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, isFormData = false } = options;

  const fetchHeaders: Record<string, string> = {
    ...headers,
  };

  if (!isFormData && body) {
    fetchHeaders["Content-Type"] = "application/json";
  }

  if (sessionCookie) {
    fetchHeaders["Cookie"] = sessionCookie;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: fetchHeaders,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    sessionCookie = setCookie;
  }

  if (!res.ok) {
    let errorMessage = `Erreur ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  return {} as T;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  profileImageUrl: string | null;
  role: "client" | "client_professionnel" | "admin" | "super_admin";
  garageId: string | null;
  companyName: string | null;
  siret: string | null;
  tvaNumber: string | null;
  companyAddress: string | null;
  companyPostalCode: string | null;
  companyCity: string | null;
  companyCountry: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  garageId: string | null;
  name: string;
  description: string;
  basePrice: string;
  category: string;
  isActive: boolean;
  estimatedDuration: string | null;
  imageUrl: string | null;
  customFormFields: any;
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  clientId: string;
  status: string;
  totalAmount: string | null;
  notes: string | null;
  items: any[];
  photos: any[];
  createdAt: string;
  updatedAt: string;
  services?: Service[];
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  role: "client" | "client_professionnel";
  companyName?: string;
  siret?: string;
  tvaNumber?: string;
  companyAddress?: string;
  companyPostalCode?: string;
  companyCity?: string;
  companyCountry?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SupportContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export const authApi = {
  register: (data: RegisterData) =>
    apiCall<{ message: string; userId: string }>("/api/register", {
      method: "POST",
      body: data,
    }),

  login: (data: LoginData) =>
    apiCall<{ user: UserProfile }>("/api/login", {
      method: "POST",
      body: data,
    }),

  logout: () =>
    apiCall("/api/logout", { method: "POST" }),

  getUser: () =>
    apiCall<UserProfile>("/api/auth/user"),

  updateUser: (data: Partial<UserProfile>) =>
    apiCall<UserProfile>("/api/auth/user", {
      method: "PUT",
      body: data,
    }),

  forgotPassword: (email: string) =>
    apiCall("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
    }),
};

export const servicesApi = {
  getAll: () => apiCall<Service[]>("/api/services"),
};

export const quotesApi = {
  getAll: () => apiCall<Quote[]>("/api/quotes"),

  create: (data: any) =>
    apiCall<Quote>("/api/quotes", {
      method: "POST",
      body: data,
    }),
};

export const uploadApi = {
  upload: async (uri: string, filename: string, type: string) => {
    const formData = new FormData();
    // In React Native, we need to handle the file object differently for FormData
    // using the 'any' cast for the object containing uri, name, and type
    const fileToUpload = {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      name: filename,
      type: type,
    };
    
    // @ts-ignore
    formData.append("media", fileToUpload);

    return apiCall<{ objectPath: string }>("/api/upload", {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },
};

export const adminQuotesApi = {
  getAll: () => apiCall<any[]>("/api/admin/quotes"),
  getById: (id: string) => apiCall<any>(`/api/admin/quotes/${id}`),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/quotes/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    apiCall(`/api/admin/quotes/${id}`, { method: "DELETE" }),
};

export const adminInvoicesApi = {
  getAll: () => apiCall<any[]>("/api/admin/invoices"),
  getById: (id: string) => apiCall<any>(`/api/admin/invoices/${id}`),
  create: (data: any) =>
    apiCall<any>("/api/admin/invoices", { method: "POST", body: data }),
  createDirect: (data: any) =>
    apiCall<any>("/api/admin/invoices/direct", { method: "POST", body: data }),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/invoices/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    apiCall(`/api/admin/invoices/${id}`, { method: "DELETE" }),
};

export const adminClientsApi = {
  getAll: () => apiCall<any[]>("/api/admin/clients"),
  getById: (id: string) => apiCall<any>(`/api/admin/clients/${id}`),
  create: (data: any) =>
    apiCall<any>("/api/admin/clients", { method: "POST", body: data }),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/clients/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    apiCall(`/api/admin/clients/${id}`, { method: "DELETE" }),
};

export const adminServicesApi = {
  getAll: () => apiCall<Service[]>("/api/admin/services"),
  getById: (id: string) => apiCall<Service>(`/api/admin/services/${id}`),
  create: (data: any) =>
    apiCall<Service>("/api/admin/services", { method: "POST", body: data }),
  update: (id: string, data: any) =>
    apiCall<Service>(`/api/admin/services/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    apiCall(`/api/admin/services/${id}`, { method: "DELETE" }),
};

export const adminUsersApi = {
  getAll: () => apiCall<any[]>("/api/admin/users"),
  getById: (id: string) => apiCall<any>(`/api/admin/users/${id}`),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/users/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    apiCall(`/api/admin/users/${id}`, { method: "DELETE" }),
};

export const adminAnalyticsApi = {
  get: () => apiCall<any>("/api/admin/analytics"),
};

export const adminReservationsApi = {
  getAll: () => apiCall<any[]>("/api/admin/reservations"),
  getById: (id: string) => apiCall<any>(`/api/admin/reservations/${id}`),
  create: (data: any) =>
    apiCall<any>("/api/admin/reservations", { method: "POST", body: data }),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/reservations/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    apiCall(`/api/admin/reservations/${id}`, { method: "DELETE" }),
};

export const adminPaymentsApi = {
  getAll: () => apiCall<any[]>("/api/admin/payments"),
  getById: (id: string) => apiCall<any>(`/api/admin/payments/${id}`),
  generateLink: (data: any) =>
    apiCall<any>("/api/admin/payment/generate-link", { method: "POST", body: data }),
};

export const adminSettingsApi = {
  get: () => apiCall<any>("/api/admin/settings"),
  update: (data: any) =>
    apiCall<any>("/api/admin/settings", { method: "PUT", body: data }),
  getGarageLegal: () => apiCall<any>("/api/admin/garage-legal"),
  updateGarageLegal: (data: any) =>
    apiCall<any>("/api/admin/garage-legal", { method: "PUT", body: data }),
};

export const adminRepairOrdersApi = {
  getAll: () => apiCall<any[]>("/api/admin/repair-orders"),
  getById: (id: string) => apiCall<any>(`/api/admin/repair-orders/${id}`),
  create: (data: any) =>
    apiCall<any>("/api/admin/repair-orders", { method: "POST", body: data }),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/repair-orders/${id}`, { method: "PUT", body: data }),
};

export const adminCreditNotesApi = {
  getAll: () => apiCall<any[]>("/api/admin/credit-notes"),
  getById: (id: string) => apiCall<any>(`/api/admin/credit-notes/${id}`),
  create: (data: any) =>
    apiCall<any>("/api/admin/credit-notes", { method: "POST", body: data }),
};

export const adminDeliveryNotesApi = {
  getAll: () => apiCall<any[]>("/api/admin/delivery-notes"),
  getById: (id: string) => apiCall<any>(`/api/admin/delivery-notes/${id}`),
  create: (data: any) =>
    apiCall<any>("/api/admin/delivery-notes", { method: "POST", body: data }),
};

export const adminExpensesApi = {
  getAll: () => apiCall<any[]>("/api/admin/expenses"),
  getCategories: () => apiCall<any[]>("/api/admin/expense-categories"),
  create: (data: any) =>
    apiCall<any>("/api/admin/expenses", { method: "POST", body: data }),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/expenses/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    apiCall(`/api/admin/expenses/${id}`, { method: "DELETE" }),
};

export const adminAccountingApi = {
  getProfitLoss: (params?: string) =>
    apiCall<any>(`/api/admin/accounting/profit-loss${params ? `?${params}` : ""}`),
  getTvaReport: (params?: string) =>
    apiCall<any>(`/api/admin/accounting/tva-report${params ? `?${params}` : ""}`),
  getCashFlow: (params?: string) =>
    apiCall<any>(`/api/admin/accounting/cash-flow${params ? `?${params}` : ""}`),
  getEntries: (params?: string) =>
    apiCall<any[]>(`/api/admin/accounting/entries${params ? `?${params}` : ""}`),
  exportFec: (params?: string) =>
    apiCall<any>(`/api/admin/accounting/fec-export${params ? `?${params}` : ""}`),
};

export const adminReviewsApi = {
  getAll: () => apiCall<any[]>("/api/admin/reviews"),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/reviews/${id}`, { method: "PUT", body: data }),
  delete: (id: string) =>
    apiCall(`/api/admin/reviews/${id}`, { method: "DELETE" }),
};

export const adminExportApi = {
  exportData: (data: any) =>
    apiCall<any>("/api/admin/export-data", { method: "POST", body: data }),
  exportDatabase: () =>
    apiCall<any>("/api/admin/export-database", { method: "POST" }),
};

export const adminAuditLogsApi = {
  getAll: () => apiCall<any[]>("/api/admin/audit-logs"),
};

export const adminEngagementsApi = {
  getAll: () => apiCall<any[]>("/api/admin/engagements"),
  getSummary: () => apiCall<any>("/api/admin/engagements/summary"),
  create: (data: any) =>
    apiCall<any>("/api/admin/engagements", { method: "POST", body: data }),
  update: (id: string, data: any) =>
    apiCall<any>(`/api/admin/engagements/${id}`, { method: "PUT", body: data }),
};

export const superAdminApi = {
  getGarages: () => apiCall<any[]>("/api/superadmin/garages"),
  getGarageById: (id: string) => apiCall<any>(`/api/superadmin/garages/${id}`),
  createGarage: (data: any) =>
    apiCall<any>("/api/superadmin/garages", { method: "POST", body: data }),
  updateGarage: (id: string, data: any) =>
    apiCall<any>(`/api/superadmin/garages/${id}`, { method: "PUT", body: data }),
  deleteGarage: (id: string) =>
    apiCall(`/api/superadmin/garages/${id}`, { method: "DELETE" }),
};

export const supportApi = {
  contact: (data: SupportContactData) =>
    apiCall<{ success: boolean; message: string }>("/api/support/contact", {
      method: "POST",
      body: data,
    }),
};

export const ocrApi = {
  scan: async (uri: string, filename: string, type: string) => {
    const formData = new FormData();
    const fileToScan = {
      uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
      name: filename,
      type: type,
    };
    
    // @ts-ignore
    formData.append("image", fileToScan);

    return apiCall<any>("/api/ocr/scan", {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },
};
