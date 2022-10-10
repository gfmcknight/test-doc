
# TestDoc

TestDoc is a small library for creating documentation and testing at the same time\. It contains the pieces to generate a markdown or HTML file _but_ you have to bring your own assertion engine\.
> This document is generated in the `test/readme.ts` file\.
# Basic Usage

Create a new document with the `document` function\. Documents have a `body` method which is the entry point for writing into the document\. Once the documentis generated, the `render` returns the document text as a string\. The `body` method accepts a function and passes in a context object to add elements\.

The following code:
```js
const doc = TestDoc.document();

await doc.body(async ctx => {
    ctx.text("Testing");
});

console.log(TestDoc.render(doc, "md", 4));
```

Results in the following document:
```

Testing
```
# Text

Text nodes output basic text to the document as their own paragraphs\. When possible, they do not attach to the previous line or element\.

The following example shows two calls to `text()` resulting in two separate paragraphs:
```js
ctx.text("Hello");
ctx.text("World");
```

Resulting in:
```

Hello

World
```
## Chaining

Text nodes can be appended to with additional calls to `text()` like so:
```js
ctx.text("Hello")
    .text("World");
```

This results in only one paragraph:
```

Hello World
```
## Bold, Italics, Strikethrough, Preformatting

Text nodes can also be appended in **bold** _italic_ ~~strikethrough~~ and `preformatted`
```js
ctx.text().bold("bold").italic("italic").strikethrough("strikethrough").preformatted("preformatted")
```

Results in
```

**bold** _italic_ ~~strikethrough~~ `preformatted`
```
> There is currently no support for text which has multiple flavors at once\.
## Text\-like nodes

The pattern wherein text of different flavors can be appended is repeated in other types of nodes\.

For instance, the note node can also use flavored text:
```js
ctx.note("Note with").italic("italics");
```

Results in
```
> Note with _italics_
```
## Special character escaping

HTML and Markdown use certain special characters to format pieces of text\. When possible, TestDoc will escape those special characters so that they present as regular text\.

In markdown, the following characters get escaped: \\\`\*\_\{\}\[\]\(\)\#\+\-\.\!

In HTML, it's these characters: &<>"

So, for instance, the following text:
```js
ctx.text("Samples: \\ ` * _ { } [ ] ( ) # + - . !");
```

Will be escaped as such:
```

Samples: \\ \` \* \_ \{ \} \[ \] \( \) \# \+ \- \. \!
```
# Sections and Subsection

TestDoc supports sections and subsections as sets of elements following headers\. They are represented either as a list of elements, or as a set of callbacks\.

The following syntax using lists:
```js
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
```

And the equivalent callback syntax:
```js
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
```

Produce a document with varying levels of headers:
```
# Heading A

Text A

Text B
## Heading B

Text C

Text D
# Heading C

Text E

Text F
```