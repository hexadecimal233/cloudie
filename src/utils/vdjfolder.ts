import * as xml2js from "xml2js"

interface SongAttributes {
  path: string
  size: string
  songlength: string
  bpm: string
  key: string
  artist: string
  title: string
  idx: string
}

interface SongNode {
  $: SongAttributes
}

interface VirtualFolderAttributes {
  noDuplicates: string
}

interface VirtualFolderNode {
  $: VirtualFolderAttributes
  song: SongNode[]
}

interface XmlObject {
  VirtualFolder: VirtualFolderNode
}

export async function parseXmlToObject(xmlString: string): Promise<XmlObject> {
  const parser = new xml2js.Parser({
    // 配置选项：
    explicitArray: true, // 即使只有一个子节点，也将其放入数组中 (例如 song 节点)
    attrkey: "$", // 属性键名设置为 $
    // ignoreAttrs: false, // 默认保留属性
    // tagNameProcessors: [xml2js.processors.stripPrefix] // 可选：去除命名空间前缀
  })

  return new Promise((resolve, reject) => {
    parser.parseString(xmlString, (err, result) => {
      if (err) {
        return reject(err)
      }
      resolve(result as XmlObject)
    })
  })
}

export function serializeObjectToXml(obj: XmlObject): string {
  const builder = new xml2js.Builder({
    // 配置选项：
    rootName: "VirtualFolder", // 可选：指定根节点名称
    headless: false, // 包含 XML 声明 (<?xml...?>)
    renderOpts: {
      pretty: true, // 格式化输出 (缩进)
      indent: "  ",
      newline: "\n",
    },
    attrkey: "$", // 属性键名设置为 $
  })

  // 注意：需要构建一个包含 XML 根节点的对象
  return builder.buildObject(obj)
}
