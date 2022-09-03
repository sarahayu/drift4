import { useEffect, useRef, useState } from "react";
import { rearrangeObjectProps } from "./Utils";

const useDragger = ({ setDocs, updateDoc }) => {
    const [ draggedItem, setDraggedItem ] = useState(null);
    const lastDraggedItem = useRef(null);

    const onDragEnd = () => {
        setDraggedItem(null);
        window.onmouseup = null;
    }
    const onDragStart = docid => {
        setDraggedItem(docid);
        window.onmouseup = onDragEnd;
    }
    const onDragEnter = docid => {
        if (draggedItem && draggedItem != docid) {
            setDocs(oldDocs => {
                let newDocsKeys = Object.keys(oldDocs);
    
                let draggedIndex = newDocsKeys.indexOf(draggedItem);
                let movingDownwards = newDocsKeys.indexOf(docid) >= draggedIndex;
    
                newDocsKeys.splice(draggedIndex, 1);
    
                let draggedOverIndex = newDocsKeys.indexOf(docid);
    
                newDocsKeys.splice(draggedOverIndex + movingDownwards, 0, draggedItem);

                return rearrangeObjectProps(oldDocs, newDocsKeys);
            })
        }
    }

    useEffect(() => {
        if (draggedItem == null) {
            if (lastDraggedItem.current != null)
                updateDoc(lastDraggedItem.current, { grabbed: false });
        }
        else
            updateDoc(draggedItem, { grabbed: true });
        lastDraggedItem.current = draggedItem;
    }, [draggedItem]);

    return { onDragStart, onDragEnter, onDragEnd };
}

export default useDragger;