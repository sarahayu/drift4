import DocOptions from "./DocOptions";

function DocCardHeader({ doc, onDragStart, pmContext }) {
    return (
        <div className="docbar">
            <img src="tictactoe.svg" alt="drag indicator" title="Drag to change order of document" 
                onMouseDown={ () => onDragStart(doc.id) } draggable={ false } />
            <div className="doc-name">{ doc.title }</div>
            <DocOptions { ...{ ...doc, pmContext } } />
        </div>
    )
}

export default DocCardHeader;