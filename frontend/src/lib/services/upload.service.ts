import { getAccessToken } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function requestUploadURL(filename: string, contentType: string): Promise<{ upload_url: string; object_name: string }> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token found");
  }

  const response = await fetch(`${API_URL}/upload/request-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename,
      content_type: contentType,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to request upload URL");
  }

  return response.json();
}
