/**
 * OpenAPI 3.0 document for Swagger UI (`/docs`) and machine clients (`/openapi.json`).
 */
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Patty & Stack API",
    description:
      "REST API for the Patty & Stack burger & sandwich storefront: catalog and orders. Interactive docs: `/docs`, `/docs/`, or `/api/docs` (same UI).",
    version: "1.0.0",
  },
  servers: [{ url: "/", description: "Current host" }],
  tags: [
    { name: "Health", description: "Liveness" },
    { name: "Products", description: "Menu catalog" },
    { name: "Orders", description: "Checkout (in-memory on serverless)" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        operationId: "getHealth",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["ok", "service"],
                  properties: {
                    ok: { type: "boolean", example: true },
                    service: { type: "string", example: "burger-shop-api" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/products": {
      get: {
        tags: ["Products"],
        summary: "List products",
        operationId: "listProducts",
        parameters: [
          {
            name: "category",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["burger", "sandwich", "side", "drink"] },
          },
          {
            name: "tag",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter by product tag (exact match)",
          },
          {
            name: "q",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Search name and description",
          },
        ],
        responses: {
          "200": {
            description: "List of products",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Product" } },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/products/{slug}": {
      get: {
        tags: ["Products"],
        summary: "Get product by slug",
        operationId: "getProductBySlug",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string", example: "classic-double" },
          },
        ],
        responses: {
          "200": {
            description: "Product",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: { data: { $ref: "#/components/schemas/Product" } },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/orders": {
      post: {
        tags: ["Orders"],
        summary: "Create order",
        operationId: "createOrder",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateOrderRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Order created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: {
                    data: {
                      type: "object",
                      required: ["id", "createdAt", "totalCents"],
                      properties: {
                        id: { type: "string", example: "ord_a1b2c3d4" },
                        createdAt: { type: "string", format: "date-time" },
                        totalCents: { type: "integer", example: 15299 },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order by id",
        operationId: "getOrderById",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "ord_a1b2c3d4" },
          },
        ],
        responses: {
          "200": {
            description: "Order",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: { data: { $ref: "#/components/schemas/Order" } },
                },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    responses: {
      BadRequest: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorBody" },
          },
        },
      },
      NotFound: {
        description: "Not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorBody" },
          },
        },
      },
    },
    schemas: {
      ErrorBody: {
        type: "object",
        properties: {
          error: { type: "string" },
          details: { type: "object", additionalProperties: true },
        },
      },
      ProductCategory: {
        type: "string",
        enum: ["burger", "sandwich", "side", "drink"],
      },
      Product: {
        type: "object",
        required: [
          "id",
          "slug",
          "name",
          "description",
          "priceCents",
          "category",
          "imagePath",
          "tags",
        ],
        properties: {
          id: { type: "string" },
          slug: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          priceCents: { type: "integer", description: "Price in USD cents" },
          category: { $ref: "#/components/schemas/ProductCategory" },
          imagePath: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          spicyLevel: { type: "integer", enum: [0, 1, 2, 3], nullable: true },
        },
      },
      OrderLineInput: {
        type: "object",
        required: ["productId", "quantity"],
        properties: {
          productId: { type: "string" },
          quantity: { type: "integer", minimum: 1, maximum: 20 },
        },
      },
      Customer: {
        type: "object",
        required: ["name", "email", "phone", "addressLine1", "city", "postalCode"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120 },
          email: { type: "string", format: "email" },
          phone: { type: "string", minLength: 8, maxLength: 32 },
          addressLine1: { type: "string", minLength: 4, maxLength: 160 },
          addressLine2: { type: "string", maxLength: 160 },
          city: { type: "string", minLength: 2, maxLength: 80 },
          postalCode: { type: "string", minLength: 3, maxLength: 20 },
          notes: { type: "string", maxLength: 500 },
        },
      },
      CreateOrderRequest: {
        type: "object",
        required: ["customer", "items"],
        properties: {
          customer: { $ref: "#/components/schemas/Customer" },
          items: {
            type: "array",
            minItems: 1,
            maxItems: 30,
            items: { $ref: "#/components/schemas/OrderLineInput" },
          },
        },
      },
      OrderLineResolved: {
        type: "object",
        properties: {
          productId: { type: "string" },
          name: { type: "string" },
          quantity: { type: "integer" },
          unitPriceCents: { type: "integer" },
          lineTotalCents: { type: "integer" },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          customer: { $ref: "#/components/schemas/Customer" },
          items: { type: "array", items: { $ref: "#/components/schemas/OrderLineResolved" } },
          subtotalCents: { type: "integer" },
          taxCents: { type: "integer" },
          totalCents: { type: "integer" },
        },
      },
    },
  },
} as const;
