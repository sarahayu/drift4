import { useContext, useEffect, useRef, useState } from "react";
import { GutsContext } from './GutsContext';
import useDragger from "./utils/Dragger";
import { bytesToMB, ENTER_KEY, prevDefStopProp, prevDefStopPropCb, rearrangeObjectProps } from "./utils/Utils";

function Filelist(props) {
    const { docs, setDocs, updateDoc } = useContext(GutsContext);
    const { onDragStart, onDragEnter, onDragEnd } = useDragger({ setDocs, updateDoc });

    const toggleOpenDoc = docid => {
        updateDoc(docid, doc => ({
            opened: !doc.opened,
            hasUnfolded: false,
        }));
    }

    return (
        <>
        <a className="acsblty-skip" href="#main-content">Skip file list</a>
        {
            Object.entries(docs).map(([ind, doc]) => 
               <FileListItem {...{ ...doc, toggleOpenDoc, onDragStart, onDragEnter, onDragEnd }} key={ doc.id } />
            )
        }
        </>
    );
}

function FileListItem({ id, opened, grabbed, title, size, toggleOpenDoc, onDragStart, onDragEnter, onDragEnd }) {

    const getClasses = () => `list-item ${ opened ? 'active' : '' } ${ grabbed ? 'grabbed' : '' }`;
    const getTooltip = () => `${ title }\nSize: ${ bytesToMB(size) }MB`;

    const enterKeyToggleOpen = ev => {
        if (ev.target === ev.currentTarget && ev.keyCode == ENTER_KEY) {
            ev.preventDefault();
            ev.stopPropagation();
            toggleOpenDoc(id);
        }
    }

    const deleteDoc = ev => {
        ev.stopPropagation();
        console.log("TODO delete doc");
    }

    return (
        <li className={ getClasses() } title={ getTooltip() } tabIndex={ 0 } 
            onPointerOver={ () => onDragEnter(id) } onClick={ () => toggleOpenDoc(id) } 
            onKeyDown={ enterKeyToggleOpen } >
            <img onMouseDown={ prevDefStopPropCb(() => onDragStart(id)) } onClick={ prevDefStopProp } 
                src="hamburger.svg" alt="drag indicator" draggable={ false } title="Drag to change order of document" />
            <span>{ title }</span>
            <button className="deleter" onClick={ deleteDoc }>
                <img src="delete.svg" alt="delete icon" draggable={ false }/>
            </button>
        </li>
    )
}

export default Filelist;