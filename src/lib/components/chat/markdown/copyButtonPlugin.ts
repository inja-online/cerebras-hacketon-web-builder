import { visit } from "unist-util-visit";

export function CopyButtonPlugin(options: any) {
  return (tree: any) => {
    visit(tree, "code", (node) => {
      node.meta = {
        ...(node.meta || {}),
        code: node.value
      };
    });

  };
}


export function CopyButtonPluginAdd(options: any) {
  return (tree: any) => {
    visit(tree, "code", (node) => {
      // console.log(node)
    });

  };
}
