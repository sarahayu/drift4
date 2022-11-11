import { useEffect, useState } from "react";
import { hasData, includeDocInSelf } from "utils/Utils";
import DocContentAligned from "./aligned/DocContentAligned";
import DocCardHeader from "./DocCardHeader";
import DocContentUnaligned from "./unaligned/DocContentUnaligned";

function DocCard(props) {

    let { doc, onDragEnter } = props;

    const [ hasUnfolded, setHasUnfolded ] = useState(false);        // for roll-down animation not to activate every time docs are re-ordered
    const [ pmContext, setPMContext ] = useState();                 // so header can know prosodic content data, like selection window

    const classList = `driftitem ${ doc.grabbed ? 'grabbed' : '' } ${ !hasUnfolded ? 'firstunfold' : '' }`;

    useEffect(() => {
        setTimeout(() => setHasUnfolded(true), 300);
    }, []);

    return (
        <div className={ classList } onPointerOver={ () => onDragEnter(doc.id) }>
            <DocCardHeader { ...{ ...props, pmContext } } />
            <div className="driftitem-content">
            {
                hasData(doc) ?
                    <DocContentAligned { ...{ ...includeDocInSelf(doc), setPMContext } } /> :
                    <DocContentUnaligned { ...includeDocInSelf(doc) } />
            }
            </div>
        </div>  
    );
}



export default DocCard;