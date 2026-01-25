import { describe, it, expect, beforeAll } from "vitest";

// Test the utility functions used by sendShareNotification
// The actual cloud function integration would require firebase-functions-test
// For now, we verify the escapeHtml behavior which is critical for XSS prevention

describe("XSS prevention via escapeHtml", () => {
  let escapeHtml;

  beforeAll(async () => {
    const utils = await import("./utils.js");
    escapeHtml = utils.escapeHtml;
  });

  it("escapes script tags in user-provided values", () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = escapeHtml(malicious);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escaped).not.toContain("<script>");
  });

  it("escapes HTML in image tags", () => {
    const escaped = escapeHtml('<img src="x" onerror="alert(1)">');
    expect(escaped).not.toContain("<img");
    expect(escaped).toContain("&lt;img");
  });

  it("escapes mixed HTML and script content", () => {
    const escaped = escapeHtml('Title<script>evil()</script>');
    expect(escaped).toBe("Title&lt;script&gt;evil()&lt;/script&gt;");
  });

  it("escapes anchor tags with javascript protocol", () => {
    const escaped = escapeHtml('<a href="javascript:alert(1)">click</a>');
    expect(escaped).toBe('&lt;a href=&quot;javascript:alert(1)&quot;&gt;click&lt;/a&gt;');
  });

  it("handles nested HTML entities", () => {
    const escaped = escapeHtml('<<script>>');
    expect(escaped).toBe("&lt;&lt;script&gt;&gt;");
  });
});

describe("sendShareNotification handler structure", () => {
  it("exports sendShareNotification function", async () => {
    // Just verify the module exports correctly
    // Full integration testing would require firebase-functions-test
    const indexModule = await import("./index.js");
    expect(indexModule.sendShareNotification).toBeDefined();
    expect(typeof indexModule.sendShareNotification).toBe("function");
  });
});
