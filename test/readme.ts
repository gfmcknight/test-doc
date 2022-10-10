import { expect } from "earljs";
import { TestDoc, ContextOf } from "../index";
import * as ts from "typescript";
import fs from "fs/promises";

const AsyncFunction = (async function () {}).constructor as any;

async function executeSnippet(script: string) {
    const doc = TestDoc.document();
    await doc.body(async ctx => {
        const func = new AsyncFunction("ctx", script);
        await Promise.resolve(func(ctx));
    });
    return TestDoc.render(doc, "md", 4);
}

async function executeFullExample(script: string) {
    script = ts.transpile(script);
    let logged: string | undefined = undefined;
    const consoleSpy = {
        log: (arg: string) => logged = arg
    }
    const func = new AsyncFunction("TestDoc", "console", script);
    await Promise.resolve(func(TestDoc, consoleSpy));
    return logged || "";
}

const SAMPLE_USAGE = `
const doc = TestDoc.document();

await doc.body(async ctx => {
    ctx.text("Testing");
});

console.log(TestDoc.render(doc, "md", 4));
`;

const SAMPLE_TWO_TEXTS = `
ctx.text("Hello");
ctx.text("World");
`;

const SAMPLE_APPENDED_TEXT = `
ctx.text("Hello")
    .text("World");
`;

const SAMPLE_TEXT_FLAVORS = `
ctx.text().bold("bold").italic("italic").strikethrough("strikethrough").preformatted("preformatted")
`;

const SAMPLE_NOTE_WITH_FLAVORS = `
ctx.note("Note with").italic("italics");
`;

const SAMPLE_ESCAPED_TEXT = `
ctx.text("Samples: \\\\ \` * _ { } [ ] ( ) # + - . !");
`;

const SAMPLE_SECTIONS_LIST = `
await ctx.section("Heading A", [
    ctx.text("Text A"),
    ctx.text("Text B"),
    await ctx.section("Heading B", [
        ctx.text("Text C"),
        ctx.text("Text D"),
    ])
]);
await ctx.section("Heading C", [
    ctx.text("Text E"),
    ctx.text("Text F"),
]);
`;

const SAMPLE_SECTIONS_CALLBACK = `
await ctx.section("Heading A", async ctx => {
    ctx.text("Text A");
    ctx.text("Text B");
    await ctx.section("Heading B", async ctx => {
        ctx.text("Text C");
        ctx.text("Text D");
    });
});
await ctx.section("Heading C", async ctx => {
    ctx.text("Text E");
    ctx.text("Text F");
});
`;

(async () => {
    const doc = TestDoc.document();
    await doc.body(async ctx => {
        await ctx.section("TestDoc", async (ctx: ContextOf<typeof doc>) => {
            ctx.text("TestDoc is a small library for creating documentation and testing at the same time.")
                .text("It contains the pieces to generate a markdown or HTML file").italic("but")
                .text("you have to bring your own assertion engine.");

            ctx.note("This document is generated in the").preformatted("test/readme.ts").text("file.");
        });

        await ctx.section("Basic Usage", async (ctx: ContextOf<typeof doc>) => {
            ctx.text("Create a new document with the").preformatted("document").text("function.")
                .text("Documents have a").preformatted("body").text("method which is the entry point for writing into the document.")
                .text("Once the documentis generated, the").preformatted("render").text("returns the document text as a string.")
                .text("The").preformatted("body").text("method accepts a function and passes in a context object to add elements.");
            
            ctx.text("The following code:");
            ctx.sample(SAMPLE_USAGE, "js");
            ctx.text("Results in the following document:");
            const sampleResult = await executeFullExample(SAMPLE_USAGE);
            expect(sampleResult).toEqual(expect.stringMatching("Testing"));
            ctx.sample(sampleResult);
        });

        await ctx.section("Text", async (ctx: ContextOf<typeof doc>) => {
            ctx.text("Text nodes output basic text to the document as their own paragraphs.")
                .text("When possible, they do not attach to the previous line or element.");
            
            ctx.text("The following example shows two calls to").preformatted("text()")
                .text("resulting in two separate paragraphs:");
        
            ctx.sample(SAMPLE_TWO_TEXTS, "js");
            ctx.text("Resulting in:")
            const twoTextsResult = await executeSnippet(SAMPLE_TWO_TEXTS);
            expect(twoTextsResult).toEqual(expect.stringMatching("Hello\n\nWorld"));
            ctx.sample(twoTextsResult);

            await ctx.section("Chaining", async (ctx: ContextOf<typeof doc>) => {
                ctx.text("Text nodes can be appended to with additional calls to").preformatted("text()").text("like so:");
                ctx.sample(SAMPLE_APPENDED_TEXT, "js");
                ctx.text("This results in only one paragraph:");
                const appendTextResult = await executeSnippet(SAMPLE_APPENDED_TEXT);
                expect(appendTextResult).toEqual(expect.stringMatching("Hello World"));
                ctx.sample(appendTextResult);
            });

            await ctx.section("Bold, Italics, Strikethrough, Preformatting", async (ctx: ContextOf<typeof doc>) => {
                ctx.text("Text nodes can also be appended in")
                    .bold("bold")
                    .italic("italic")
                    .strikethrough("strikethrough").text("and")
                    .preformatted("preformatted");
                
                ctx.sample(SAMPLE_TEXT_FLAVORS, "js");
                ctx.text("Results in")
                const flavorTextResult = await executeSnippet(SAMPLE_TEXT_FLAVORS);
                expect(flavorTextResult).toEqual(expect.stringMatching("**bold** _italic_ ~~strikethrough~~ `preformatted`"));
                ctx.sample(flavorTextResult);
                ctx.note("There is currently no support for text which has multiple flavors at once.")
            });

            await ctx.section("Text-like nodes", async (ctx: ContextOf<typeof doc>) => {
                ctx.text("The pattern wherein text of different flavors can be appended is repeated in other types of nodes.");
                ctx.text("For instance, the note node can also use flavored text:")
                ctx.sample(SAMPLE_NOTE_WITH_FLAVORS, "js");
                ctx.text("Results in")
                const flavorNoteResult = await executeSnippet(SAMPLE_NOTE_WITH_FLAVORS);
                expect(flavorNoteResult).toEqual(expect.stringMatching("> Note with _italics_"));
                ctx.sample(flavorNoteResult);
            });

            await ctx.section("Special character escaping", async (ctx: ContextOf<typeof doc>) => {
                ctx.text("HTML and Markdown use certain special characters to format pieces of text.")
                    .text("When possible, TestDoc will escape those special characters so that they present as regular text.");
                    
                ctx.text("In markdown, the following characters get escaped: \\`*_{}[]()#+-.!");
                ctx.text("In HTML, it's these characters: &<>\"");
                
                ctx.text("So, for instance, the following text:")
                ctx.sample(SAMPLE_ESCAPED_TEXT, "js");
                ctx.text("Will be escaped as such:")
                const escapedTextResult = await executeSnippet(SAMPLE_ESCAPED_TEXT);
                expect(escapedTextResult).toEqual(expect.stringMatching("\\\\ \\` \\* \\_ \\{ \\} \\[ \\] \\( \\) \\# \\+ \\- \\. \\!"));
                ctx.sample(escapedTextResult);
            });
        });

        await ctx.section("Sections and Subsection", async (ctx: ContextOf<typeof doc>) => {
            ctx.text("TestDoc supports sections and subsections as sets of elements following headers.")
                .text("They are represented either as a list of elements, or as a set of callbacks.");

            ctx.text("The following syntax using lists:");
            ctx.sample(SAMPLE_SECTIONS_LIST, "js");
            ctx.text("And the equivalent callback syntax:")
            ctx.sample(SAMPLE_SECTIONS_CALLBACK, "js");

            ctx.text("Produce a document with varying levels of headers:");
            const sectionsFromList = await executeSnippet(SAMPLE_SECTIONS_LIST);
            const sectionsFromCallback = await executeSnippet(SAMPLE_SECTIONS_CALLBACK);
            expect(sectionsFromList).toEqual(sectionsFromCallback);
            expect(sectionsFromList).toEqual(expect.stringMatching([
                "# Heading A",
                "",
                "Text A",
                "",
                "Text B",
                "## Heading B",
                "",
                "Text C",
                "",
                "Text D",
                "# Heading C",
                "",
                "Text E",
                "",
                "Text F"
            ].join("\n")));
            ctx.sample(sectionsFromList);
        });
    });

    await fs.writeFile("README.md", TestDoc.render(doc, "md", 4));
})()
