# Deploying to Railway: A Detailed Guide

This guide provides step-by-step instructions for deploying your multi-service application to Railway.

## Prerequisites

1.  **Railway Account**: Ensure you have an active Railway account.
2.  **GitHub Repository**: Your project code must be hosted on a GitHub repository.
3.  **Railway CLI (Optional but Recommended)**: For easier management, install the [Railway CLI](https://docs.railway.app/cli/installation).

## Step 1: Create a New Project on Railway

1.  Log in to your Railway dashboard.
2.  Click the "**New Project**" button.
3.  Select "**Deploy from GitHub repo**" and choose your project's repository.

Railway will analyze your repository. We will manually configure the services since there are multiple.

## Step 2: Provision Backing Services

In your Railway project, click the "**+ New**" button to add each of the following services from the marketplace:

1.  **PostgreSQL**:
    -   Click "**+ New**" -> "**Database**" -> "**PostgreSQL**".
2.  **Neo4j**:
    -   Click "**+ New**" -> "**Database**" -> "**Neo4j**".
3.  **Redis**:
    -   Click "**+ New**" -> "**Database**" -> "**Redis**".
4.  **Minio**:
    -   Click "**+ New**" -> "**Backing Service**" -> "**Minio**".

After creating each service, Railway will automatically provision it. You can find the connection URLs and credentials in the "**Variables**" tab of each service.

## Step 3: Deploy the Backend (api-gateway)

1.  Click "**+ New**" -> "**GitHub Repo**" and select your repository again.
2.  Go to the new service's "**Settings**" tab.
3.  **Service Name**: Rename the service to `api-gateway`.
4.  **Root Directory**: Set the "Root Directory" to `backend`.
5.  **Environment Variables**: In the "**Variables**" tab, add the following. Get the values from the services you created in Step 2.

    ```bash
    # From your PostgreSQL service on Railway
    DATABASE_URL=...

    # From your Neo4j service on Railway
    NEO4J_URI=...
    NEO4J_USERNAME=neo4j
    NEO4J_PASSWORD=...

    # From your Redis service on Railway
    REDIS_URL=...

    # From your Minio service on Railway
    MINIO_ENDPOINT=...
    MINIO_ACCESS_KEY_ID=...
    MINIO_SECRET_ACCESS_KEY=...
    MINIO_USE_SSL=true
    MINIO_BUCKET_NAME=media

    # Other variables
    JWT_SECRET=your_strong_jwt_secret # Change this to a strong secret
    API_GATEWAY_PORT=8080
    MIGRATIONS_PATH=file:///home/appuser/migrations
    ```

## Step 4: Deploy the Frontend

1.  Click "**+ New**" -> "**GitHub Repo**" and select your repository again.
2.  Go to the new service's "**Settings**" tab.
3.  **Service Name**: Rename the service to `frontend`.
4.  **Root Directory**: Set the "Root Directory" to `frontend`.
5.  **Environment Variables**: In the "**Variables**" tab, add the following:

    ```bash
    NEXT_PUBLIC_API_URL=https://your-api-gateway-service-name.up.railway.app
    ```
    Replace `your-api-gateway-service-name` with the public URL of your `api-gateway` service (from its "Settings" tab).

6.  **Update `next.config.ts`**: You need to allow images from your Minio service. In your `frontend/next.config.ts` file, replace the `localhost` image pattern:

    **Replace this:**
    ```javascript
          {
            protocol: 'http',
            hostname: 'localhost',
            port: '9000',
            pathname: '/attendwise/**',
          },
    ```

    **With this:**
    ```javascript
          {
            protocol: 'https',
            hostname: 'your-minio-service-hostname', // e.g., minio.up.railway.app
            port: '',
            pathname: '/attendwise/**',
          },
    ```
    You can find `your-minio-service-hostname` in the "Settings" of your Minio service on Railway.

## Step 5: AI Service (Optional)

Your `docker-compose.yml` includes a commented-out `ai-service`. If you need to deploy it, create another service from your GitHub repo, set its "Root Directory" to `backend/ai-service`, and configure its environment variables.

## Step 6: Final Steps

-   **Trigger Deployment**: After configuring each service, Railway should automatically trigger a new deployment. If not, you can trigger one manually from the dashboard.
-   **Check Logs**: You can monitor the build and deployment logs for each service in its "**Deployments**" tab to troubleshoot any issues.
