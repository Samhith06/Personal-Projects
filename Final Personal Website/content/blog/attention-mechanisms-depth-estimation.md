---
title: "What attention mechanisms actually buy you in depth estimation"
date: "2026-01-20"
excerpt: "Integrating CBAM-style spatial and channel attention into ResNet and DenseNet backbones for monocular depth estimation — and where the gains really came from."
tags: ["Machine Learning", "PyTorch", "Computer Vision"]
readTime: "5 min read"
---

Monocular depth estimation — predicting a depth map from a single RGB image — is a deceptively hard problem. There's no stereo disparity to lean on, so the model has to infer depth from texture, occlusion, and learned priors about how scenes are usually structured.

## The baseline problem

Plain encoder-decoder architectures (DenseNet-121, ResNet-50, ResNet-101 as backbones) tend to blur fine depth boundaries — edges of objects, thin structures, anything that requires the model to be "confident" about a sharp transition.

## Where attention helped

Adding spatial and channel attention modules (in a CBAM-style block) gave the network a way to reweight feature maps based on *where* and *what* mattered most for a given region, rather than treating every channel and pixel equally.

Concretely, this meant:

- **~50% error reduction on DIODE** — a dataset with genuinely hard outdoor and indoor scenes
- **~40% improvement on NYU** — indoor scenes with more structured geometry
- Visibly sharper object boundaries in the predicted depth maps, especially around furniture edges and doorways

## The honest caveat

Attention modules aren't free — they add parameters and inference time. The gains were worth it for this use case, but it's a tradeoff worth measuring explicitly rather than assuming "more attention = better" by default.

## Tooling notes

Training ran on Kaggle and Google Colab with NVIDIA GPUs, which was more than sufficient for this scale of experimentation — a good reminder that you don't always need a dedicated cluster to do meaningful ML research.
