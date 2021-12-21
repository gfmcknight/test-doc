 import "jasmine"
 import TestDoc from "../src/index"

describe("TestDoc Document", () => {
    it("can render text", () => {
        let doc = new TestDoc.TestDocDocument();
        doc.getContext().text("Hello");
        expect(doc.renderAsHTML()).toContain("Hello");
    });

    it("can render sections from lists", () => {
        let doc = new TestDoc.TestDocDocument();
        let context = doc.getContext();
        context.section("MySection", [
            context.text("MyTestString")
        ]);
        let result = doc.renderAsHTML();
        expect(result).toContain("<h1> MySection </h1>");
        expect(result).toContain("MyTestString");
        
        // The text should only have been added once
        expect(result.split("MyTestString").length).toBe(2);
        expect(result.indexOf("MySection")).toBeLessThan(result.indexOf("MyTestString"));
    });

    it("can render sections from closures", () => {
        let doc = new TestDoc.TestDocDocument();
        let context = doc.getContext();
        context.section("MySection", (context) => {
            context.text("MyTestString")
        });
        let result = doc.renderAsHTML();
        expect(result).toContain("<h1> MySection </h1>");
        expect(result).toContain("MyTestString");
        
        // The text should only have been added once
        expect(result.split("MyTestString").length).toBe(2);
        expect(result.indexOf("MySection")).toBeLessThan(result.indexOf("MyTestString"));
    });

    it("can render images", () => {
        let doc = new TestDoc.TestDocDocument();
        let context = doc.getContext();
        
    });
});