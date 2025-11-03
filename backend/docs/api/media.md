# Media

This module provides endpoints for handling media uploads, where files are uploaded directly from the client to the server, and the server then uploads them to the configured object storage (e.g., MinIO).

## Upload File Directly

Handles direct file uploads from the client. The client sends the file as part of a `multipart/form-data` request, and the server uploads the file to the configured object storage.

- **Endpoint**: `POST /api/v1/media/upload`
- **Authentication**: Required (Bearer Token)

### Request Body

The request must include a `multipart/form-data` body with a single file field named `file`.

#### Example Form Data
```plaintext
Content-Disposition: form-data; name="file"; filename="example.jpg"
Content-Type: image/jpeg

<file content>
```

### Response Body (200 OK)

```json
{
  "message": "File uploaded successfully",
  "final_url": "string", // The URL where the file is accessible after a successful upload.
  "upload_url": "string" // For compatibility with old frontend logic (same as final_url).
}
```

### Error Responses

- **400 Bad Request**:
  ```json
  {
    "error": "File not provided or invalid"
  }
  ```
  This error occurs if the `file` field is missing or invalid in the request.

- **500 Internal Server Error**:
  ```json
  {
    "error": "Failed to upload file"
  }
  ```
  This error occurs if there is an issue during the file upload process to the storage service.

### Example `curl`

#### Uploading a File
```bash
curl -X POST http://localhost:8080/api/v1/media/upload \
  -H "Authorization: Bearer <your_access_token>" \
  -F "file=@/path/to/your/file.jpg"
```

#### Successful Response
```json
{
  "message": "File uploaded successfully",
  "final_url": "https://storage.example.com/uploads/abc123-example.jpg",
  "upload_url": "https://storage.example.com/uploads/abc123-example.jpg"
}
```
