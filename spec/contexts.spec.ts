 import "jasmine"
 import TestDoc from "../src/index"

describe("TestDoc Document", () => {
    it("can render text", () => {
        let doc = new TestDoc.TestDocDocument();
        doc.getContext().text("Hello");
        expect(doc.renderAsHTML()).toContain("Hello");
    });

    it("can render images", async () => {
        let doc = new TestDoc.TestDocDocument();
        let context = doc.getContext();
        await context.section("MySection", () => {

        })
    });

    it("can render sections from lists", async () => {
        let doc = new TestDoc.TestDocDocument();
        let context = doc.getContext();
        await context.section("MySection", [
            context.text("MyTestString")
        ]);
        let result = doc.renderAsHTML();
        expect(result).toContain("<h1> MySection </h1>");
        expect(result).toContain("MyTestString");
        
        // The text should only have been added once
        expect(result.split("MyTestString").length).toBe(2);
        expect(result.indexOf("MySection")).toBeLessThan(result.indexOf("MyTestString"));
    });

    it("can render sections from closures", async () => {
        let doc = new TestDoc.TestDocDocument();
        let context = doc.getContext();
        await context.section("MySection", (context) => {
            context.text("MyTestString")
        });
        let result = doc.renderAsHTML();
        expect(result).toContain("<h1> MySection </h1>");
        expect(result).toContain("MyTestString");
        
        // The text should only have been added once
        expect(result.split("MyTestString").length).toBe(2);
        expect(result.indexOf("MySection")).withContext(`MySection should be before MyTestString in ${result}`).toBeLessThan(result.indexOf("MyTestString"));
    });
});