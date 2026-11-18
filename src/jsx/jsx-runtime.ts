/**
 * @module
 * This module provides Hono's JSX runtime.
 */

export { jsxDEV as jsx, Fragment } from './jsx-dev-runtime'
export { jsxDEV as jsxs } from './jsx-dev-runtime'
export type { JSX } from './jsx-dev-runtime'
import { html, raw } from '../helper/html'
import type { HtmlEscapedString, StringBuffer, StringBufferWithCallbacks } from '../utils/html'
import { escapeToBuffer, stringBufferToString } from '../utils/html'
import { attributeToBuffer, JSXFragmentNode, JSXNode, markRenderedJSX } from './base'
import { PERMALINK } from './constants'
import { isValidAttributeName } from './utils'

const renderTemplate: typeof html = (strings, ...values) => {
  const result = html(strings, ...values)
  return result instanceof Promise ? result.then(markRenderedJSX) : markRenderedJSX(result)
}

const hasJSXNode = (values: unknown[]): boolean =>
  values.some((value) => (Array.isArray(value) ? hasJSXNode(value) : value instanceof JSXNode))

/**
 * A template whose values include JSX elements is rendered when its parent renders it,
 * like an element created by `jsx()`, so components in it can read the context of a Provider around it.
 */
class JSXTemplateNode extends JSXFragmentNode {
  #strings: TemplateStringsArray
  #values: unknown[]
  constructor(strings: TemplateStringsArray, values: unknown[]) {
    super('', {}, [])
    this.#strings = strings
    this.#values = values
  }

  override toStringToBuffer(buffer: StringBufferWithCallbacks): void {
    this.children = [renderTemplate(this.#strings, ...this.#values) as unknown as string]
    super.toStringToBuffer(buffer)
  }
}

export const jsxTemplate: typeof html = (strings, ...values) =>
  hasJSXNode(values)
    ? (new JSXTemplateNode(strings, values) as unknown as HtmlEscapedString)
    : renderTemplate(strings, ...values)

export const jsxAttr = (
  key: string,
  v: string | Promise<string> | Record<string, string | number | null | undefined | boolean>
): HtmlEscapedString | Promise<HtmlEscapedString> => {
  if (!isValidAttributeName(key)) {
    return raw('')
  }
  if (typeof v === 'string') {
    const buffer: StringBuffer = [`${key}="`]
    escapeToBuffer(v, buffer)
    return raw(buffer[0] + '"')
  }
  let value: unknown = v
  if (typeof value === 'function' && (key === 'action' || key === 'formaction')) {
    // resolved in the same way as the form, input and button intrinsic elements
    value = PERMALINK in value ? value[PERMALINK] : undefined
  }
  const buffer: StringBuffer = ['']
  attributeToBuffer(buffer, '', key, value)
  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer, undefined)
}

export const jsxEscape = (value: string) => value
