import { useContext, useEffect, useRef, useState } from "react";
import DocItem from "./docitem/DocItem";
import { GutsContext } from './GutsContext';
import { elemClassAdd, elemClassRemove, getExt, rearrangeObjectProps, stripExt } from "./utils/Utils";

function DocArea(props) {
    const { docs, setDocs, updateDoc } = useContext(GutsContext);
    const [ draggedItem, setDraggedItem ] = useState(null);
    const lastDraggedItem = useRef(null);

    const anyDocs = () => Object.values(docs).length != 0;
    const anyOpened = () => Object.values(docs).filter(doc => doc.opened).length != 0;
    const anyGrabbed = () => Object.values(docs).some(doc => doc.grabbed);

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

    useEffect(() => {
        if (anyDocs()) {
            elemClassRemove('nofiles', 'show');
            if (anyOpened())
                elemClassRemove('noneselected', 'show');
            else
                elemClassAdd('noneselected', 'show');
        }
        else {
            elemClassAdd('nofiles', 'show');
            elemClassRemove('noneselected', 'show');
        }

        if (anyGrabbed())
            elemClassAdd('dashboard', 'grabbed');
        else 
            elemClassRemove('dashboard', 'grabbed');
    }, [docs]);

    return (
        <>
        {
            Object.values(docs).filter(doc => doc.opened).map(doc => 
                <DocItem key={ doc.id } { ...{ doc, onDragStart, onDragEnter } }/>
            )
        }
        </>
    );
}

export default DocArea;