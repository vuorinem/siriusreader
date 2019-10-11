import { autoinject } from 'aurelia-framework';
import { TextUtility } from './text-utility';

@autoinject
export class DomUtility {

    constructor(private textUtility: TextUtility) {
    }

    public findOffsetForLocation(root: Node, location: number): number {
        const range = this.findRangeEndByLocation(root, location, true);

        if (!(range.endContainer instanceof CharacterData) || range.endOffset === 0) {
            // Location is at a non-text node or at the start of a text node
            return this.getNodeClientLeft(range.endContainer);
        } else if (range.endOffset === range.endContainer.length) {
            // Location is at the end of a texxt node
            return range.endContainer.parentElement!.getBoundingClientRect().right;
        } else {
            // Location is in the middle of a text node
            range.setStart(range.endContainer, 0);
            // Location points to between the pages, get offset for the first character in the page
            range.setEnd(range.endContainer, range.endOffset + 1)
            return range.getBoundingClientRect().right;
        }
    }

    public findRangeEndByLocation(root: Node, location: number, findLeftmost: boolean, range?: Range): Range {
        if (!range) {
            range = document.createRange();
            range.setStart(root, 0);
        }

        let currentNode: Node | null = root.firstChild;

        while (currentNode) {
            if (!this.findNodeEnd(range, currentNode)) {
                currentNode = currentNode.nextSibling;
                continue;
            }

            const currentLength = this.textUtility.calculateVisibleCharacters(range.toString());

            if (currentLength > location) {
                if (currentNode.hasChildNodes()) {
                    // Check child nodes of the current node
                    return this.findRangeEndByLocation(currentNode, location, findLeftmost, range);
                } else if (currentNode instanceof CharacterData) {
                    // Find correct offset within the node
                    this.findRangeOffsetForNode(currentNode, location, findLeftmost, range);
                    break;
                } else {
                    // Cannot split node, return rightmost edge
                    break;
                }
            }

            currentNode = currentNode.nextSibling;
        }

        return range;
    }

    public findNodeEnd(range: Range, node: Node): boolean {
        if (node instanceof CharacterData) {
            range.setEnd(node, node.length);

            return true;
        }

        if (node.hasChildNodes()) {
            // Find the end from child node
            let childNode: Node | null = node.lastChild;
            while (childNode) {
                if (this.findNodeEnd(range, childNode)) {
                    return true;
                }

                childNode = childNode.previousSibling;
            }
        }

        // Cannot find end position from this node
        return false;
    }

    public findRangeOffsetForNode(node: CharacterData, location: number, findLeftmost: boolean, range: Range) {

        let currentLength = this.textUtility.calculateVisibleCharacters(range.toString());

        let leftIndex = 0;
        let rightIndex = node.length;

        while (leftIndex < rightIndex) {
            const middleIndex = Math.floor((leftIndex + rightIndex) / 2);

            range.setEnd(node, middleIndex);
            currentLength = this.textUtility.calculateVisibleCharacters(range.toString());

            if (findLeftmost) {
                if (currentLength < location) {
                    leftIndex = middleIndex + 1;
                } else {
                    rightIndex = middleIndex;
                }
            } else {
                if (currentLength <= location) {
                    leftIndex = middleIndex + 1;
                } else {
                    rightIndex = middleIndex;
                }
            }
        }

        range.setEnd(node, leftIndex - (findLeftmost ? 0 : 1));
    }

    private getNodeClientLeft(node: Node): number {
        if (node instanceof Element) {
            return node.getBoundingClientRect().left;
        } else if (node && node.parentElement !== null) {
            return this.getNodeClientLeft(node.parentElement);
        } else {
            return 0;
        }
    }

}