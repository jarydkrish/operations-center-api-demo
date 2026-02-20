export interface JohnDeereOrganization {
  id: string;
  name: string;
  type: string;
  links: JohnDeereLink[];
}

export interface JohnDeereField {
  id: string;
  name: string;
  boundaries?: unknown;
  links: JohnDeereLink[];
}

export interface JohnDeereFieldOperation {
  id: string;
  type: string;
  startDate: string;
  endDate?: string;
  field?: {
    id: string;
    name: string;
  };
  crop?: {
    name: string;
  };
  variety?: {
    name: string;
  };
  harvestMoisture?: number;
  totalYield?: {
    value: number;
    unit: string;
  };
  links: JohnDeereLink[];
}

export interface JohnDeereLink {
  rel: string;
  uri: string;
}

export interface JohnDeereApiResponse<T> {
  values: T[];
  links: JohnDeereLink[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface JohnDeereTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}
