import { extractTwitterOwner } from "../scrape-creators.js";

describe("extractTwitterOwner", () => {
  it("reads GraphQL core.user_results.result.core.screen_name", () => {
    expect(
      extractTwitterOwner({
        core: {
          user_results: {
            result: {
              core: { screen_name: "ThereseUTD", name: "Therese 🇳🇴" },
            },
          },
        },
      }),
    ).toBe("ThereseUTD");
  });

  it("falls back to legacy user/author fields", () => {
    expect(extractTwitterOwner({ user: { screen_name: "elonmusk" } })).toBe("elonmusk");
    expect(extractTwitterOwner({ author: { screen_name: "@someone" } })).toBe("someone");
  });

  it("falls back to handle in tweet URL", () => {
    expect(
      extractTwitterOwner(
        {},
        "https://x.com/ThereseUTD/status/2069241661918478472?s=20",
      ),
    ).toBe("ThereseUTD");
  });
});
