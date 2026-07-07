// Minimal, dependency-free SHA-256 (FIPS 180-4). Public-domain style
// implementation — used only to seal `.aormsest` envelopes with the same digest
// the TypeScript engine produces (Web Crypto SHA-256 over `estimateSealString`).
#pragma once
#include <array>
#include <cstdint>
#include <cstring>
#include <string>

namespace aorms {

class Sha256 {
public:
  Sha256() { reset(); }

  void reset() {
    len_ = 0;
    bufLen_ = 0;
    h_ = {0x6a09e667u, 0xbb67ae85u, 0x3c6ef372u, 0xa54ff53au,
          0x510e527fu, 0x9b05688cu, 0x1f83d9abu, 0x5be0cd19u};
  }

  void update(const uint8_t* data, size_t n) {
    len_ += n;
    while (n > 0) {
      size_t take = 64 - bufLen_;
      if (take > n) take = n;
      std::memcpy(buf_ + bufLen_, data, take);
      bufLen_ += take;
      data += take;
      n -= take;
      if (bufLen_ == 64) {
        block(buf_);
        bufLen_ = 0;
      }
    }
  }

  void update(const std::string& s) {
    update(reinterpret_cast<const uint8_t*>(s.data()), s.size());
  }

  // Finalize and return the 64-char lowercase hex digest.
  std::string hexDigest() {
    uint64_t bitLen = len_ * 8;
    uint8_t pad = 0x80;
    update(&pad, 1);
    uint8_t zero = 0x00;
    while (bufLen_ != 56) update(&zero, 1);
    uint8_t lenBe[8];
    for (int i = 0; i < 8; ++i) lenBe[i] = static_cast<uint8_t>(bitLen >> (56 - 8 * i));
    update(lenBe, 8);

    static const char* hex = "0123456789abcdef";
    std::string out;
    out.reserve(64);
    for (uint32_t v : h_) {
      for (int i = 3; i >= 0; --i) {
        uint8_t byte = static_cast<uint8_t>(v >> (8 * i));
        out.push_back(hex[byte >> 4]);
        out.push_back(hex[byte & 0xf]);
      }
    }
    return out;
  }

  static std::string hex(const std::string& s) {
    Sha256 h;
    h.update(s);
    return h.hexDigest();
  }

private:
  static uint32_t rotr(uint32_t x, uint32_t n) { return (x >> n) | (x << (32 - n)); }

  void block(const uint8_t* p) {
    static const uint32_t k[64] = {
        0x428a2f98u, 0x71374491u, 0xb5c0fbcfu, 0xe9b5dba5u, 0x3956c25bu, 0x59f111f1u,
        0x923f82a4u, 0xab1c5ed5u, 0xd807aa98u, 0x12835b01u, 0x243185beu, 0x550c7dc3u,
        0x72be5d74u, 0x80deb1feu, 0x9bdc06a7u, 0xc19bf174u, 0xe49b69c1u, 0xefbe4786u,
        0x0fc19dc6u, 0x240ca1ccu, 0x2de92c6fu, 0x4a7484aau, 0x5cb0a9dcu, 0x76f988dau,
        0x983e5152u, 0xa831c66du, 0xb00327c8u, 0xbf597fc7u, 0xc6e00bf3u, 0xd5a79147u,
        0x06ca6351u, 0x14292967u, 0x27b70a85u, 0x2e1b2138u, 0x4d2c6dfcu, 0x53380d13u,
        0x650a7354u, 0x766a0abbu, 0x81c2c92eu, 0x92722c85u, 0xa2bfe8a1u, 0xa81a664bu,
        0xc24b8b70u, 0xc76c51a3u, 0xd192e819u, 0xd6990624u, 0xf40e3585u, 0x106aa070u,
        0x19a4c116u, 0x1e376c08u, 0x2748774cu, 0x34b0bcb5u, 0x391c0cb3u, 0x4ed8aa4au,
        0x5b9cca4fu, 0x682e6ff3u, 0x748f82eeu, 0x78a5636fu, 0x84c87814u, 0x8cc70208u,
        0x90befffau, 0xa4506cebu, 0xbef9a3f7u, 0xc67178f2u};
    uint32_t w[64];
    for (int i = 0; i < 16; ++i)
      w[i] = (uint32_t(p[i * 4]) << 24) | (uint32_t(p[i * 4 + 1]) << 16) |
             (uint32_t(p[i * 4 + 2]) << 8) | uint32_t(p[i * 4 + 3]);
    for (int i = 16; i < 64; ++i) {
      uint32_t s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >> 3);
      uint32_t s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    uint32_t a = h_[0], b = h_[1], c = h_[2], d = h_[3], e = h_[4], f = h_[5], g = h_[6], hh = h_[7];
    for (int i = 0; i < 64; ++i) {
      uint32_t S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      uint32_t ch = (e & f) ^ (~e & g);
      uint32_t t1 = hh + S1 + ch + k[i] + w[i];
      uint32_t S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
      uint32_t t2 = S0 + maj;
      hh = g; g = f; f = e; e = d + t1; d = c; c = b; b = a; a = t1 + t2;
    }
    h_[0] += a; h_[1] += b; h_[2] += c; h_[3] += d;
    h_[4] += e; h_[5] += f; h_[6] += g; h_[7] += hh;
  }

  std::array<uint32_t, 8> h_{};
  uint8_t buf_[64]{};
  size_t bufLen_ = 0;
  uint64_t len_ = 0;
};

} // namespace aorms
