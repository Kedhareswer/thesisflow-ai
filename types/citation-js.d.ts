declare module 'citation-js' {
  export interface CSLItem {
    id?: string
    type?: string
    title?: string
    author?: Array<{ family: string; given: string }>
    issued?: { 'date-parts': [[number, number?, number?]] }
    'container-title'?: string
    volume?: string
    issue?: string
    page?: string
    DOI?: string
    URL?: string
    [key: string]: any
  }

  export default class Cite {
    constructor(data: any)
    static async(data: any): Promise<Cite>
    format(format: string, options?: { format?: string; style?: string }): string
    get(options?: any): CSLItem[]
    add(data: any): Cite
    reset(): Cite
  }
}
