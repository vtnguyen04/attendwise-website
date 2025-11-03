import numpy as np
import torch


def L1_Distance(x: torch.Tensor, y: torch.Tensor, reduction="sum") -> torch.Tensor:

    assert reduction in ["sum", "mean"]

    dis = torch.abs(x - y)

    if reduction == "mean":
        return torch.mean(dis)
    else:
        return torch.sum(dis)


def Euclidean_Distance(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    dis = torch.sqrt(torch.sum(torch.square(x - y)))
    return dis


def Cosine_Distance(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    x_flat = x.view(-1)
    y_flat = y.view(-1)
    dot_product = torch.dot(x_flat, y_flat)
    norm_x = torch.norm(x_flat)
    norm_y = torch.norm(y_flat)
    cosine_similarity = dot_product / (norm_x * norm_y + 1e-8)
    cosine_distance = 1 - cosine_similarity
    return cosine_distance


def cosine_similarity(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    """
    Tính cosine similarity giữa hai tensor x và y.
    Trả về giá trị cosine similarity (gần 1 là giống nhau, gần -1 là ngược nhau).
    """
    x_flat = x.view(-1)
    y_flat = y.view(-1)
    dot_product = torch.dot(x_flat, y_flat)
    norm_x = torch.norm(x_flat)
    norm_y = torch.norm(y_flat)
    similarity = dot_product / (norm_x * norm_y + 1e-8)
    return similarity


def findThreshold(model_name: str, distance_metric: str) -> float:
    base_threshold = {
        "cosine_dis": 0.40,
        "cosine_sim": 0.55,
        "euclidean": 0.55,
        "L1": 0.75,
    }

    thresholds = {
        "VGG-Face1": {
            "cosine_dis": 0.40,
            "cosine_sim": 0.55,
            "euclidean": 0.31,
            "L1": 1.1,
        },
        # In this case, I just tested the threshold for Lư distance
        "VGG-Face2": {
            "cosine_dis": 0.40,
            "cosine_sim": 0.55,
            "euclidean": 0.7,
            "L1": 1.4,
        },
    }

    threshold = thresholds.get(model_name, base_threshold).get(distance_metric, 0.6)

    return threshold


if __name__ == "__main__":
    x = torch.rand(5)
    y = torch.rand(5)

    print(Cosine_Distance(x, y))
    print(L1_Distance(x, y))
    print(Euclidean_Distance(x, y))
