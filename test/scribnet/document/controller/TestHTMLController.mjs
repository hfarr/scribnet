
'use strict'
import assert from 'assert';
const PATH = "/home/henry/dev/scribnet/views"

// const { Renderer, EditRenderer, wrapOne, wrapOneAttributes, wrapMany, escapeString } = await import(`${PATH}/js/scribnet/document/renderer/Renderer.mjs`)
// const { default: HTMLRenderer } = await import(`${PATH}/js/scribnet/document/renderer/HTMLRenderer.mjs`)
// const { default: EditDocument } = await import(`${PATH}/js/scribnet/document/EditDocument.mjs`)
// const { Segment, ListSegment } = await import(`${PATH}/js/scribnet/document/Segment.mjs`)
const { Doc, Context, Segment, Gap } = await import(`${PATH}/js/scribnet/section/Context.mjs`)

const { default: HTMLController } = await import(`${PATH}/js/scribnet/document/controller/HTMLController.mjs`)
const { default: Controller, QueryDoc } = await import(`${PATH}/js/scribnet/document/controller/Controller.mjs`)
