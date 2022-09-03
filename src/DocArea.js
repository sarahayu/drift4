import { useContext, useEffect, useRef, useState } from "react";
import DocCard from "./docitem/DocCard";
import { GutsContext } from './GutsContext';
import useDragger from "./utils/useDragger";
import { elemClassAdd, elemClassRemove } from "./utils/Utils";

function DocArea(props) {
    const { docs, setDocs, updateDoc } = useContext(GutsContext);
    const { onDragStart, onDragEnter } = useDragger({ setDocs, updateDoc });

    const anyDocs = () => Object.values(docs).length != 0;
    const anyOpened = () => Object.values(docs).filter(doc => doc.opened).length != 0;
    const anyGrabbed = () => Object.values(docs).some(doc => doc.grabbed);

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
                <DocCard key={ doc.id } { ...{ doc, onDragStart, onDragEnter } }/>
            )
        }
        </>
    );
}

export default DocArea;