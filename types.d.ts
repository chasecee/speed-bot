declare module "googleapis" {
  export const google: {
    sheets: (options: { version: string; auth: unknown }) => {
      spreadsheets: {
        get: (params: unknown) => Promise<unknown>;
        values: {
          get: (params: unknown) => Promise<unknown>;
          update: (params: unknown) => Promise<unknown>;
        };
        batchUpdate: (params: unknown) => Promise<unknown>;
      };
    };
  };
}

declare module "google-auth-library" {
  export class JWT {
    constructor(options: { email: string; key: string; scopes: string[] });
  }
}
