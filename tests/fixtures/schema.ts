import type { Link } from "../../src/domain/types.js";

declare module "../../src/domain/types.js" {
  interface TsScenarioResources {
    organizations: {
      input: {
        name: string;
        slug: string;
      };
      record: {
        id: string;
        name: string;
        slug: string;
      };
    };

    users: {
      input: {
        name: string;
        role: "viewer" | "admin" | "editor";
        organization_id: Link<"organizations">;
      };
      record: {
        id: string;
        name: string;
        role: "viewer" | "admin" | "editor";
        organization_id: string;
      };
    };

    posts: {
      input: {
        title: string;
        status: "draft" | "review" | "published";
        author_id: Link<"users">;
        organization_id: Link<"organizations">;
      };
      record: {
        id: string;
        title: string;
        status: "draft" | "review" | "published";
        author_id: string;
        organization_id: string;
      };
    };
  }
}

export {};
