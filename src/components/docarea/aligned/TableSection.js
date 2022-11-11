import { linkFragment } from "utils/Utils";
import MeasuresTable from "./MeasuresTable";

function TableSection(props) {

    return (
        <section className="table-section">
            <MeasuresTable {...props} />
            <span><a
                href={linkFragment('prosodic-measures.html', 'Full Recording Duration vs. Selection', 'full-vs-selection')}
                title="Click for more information"
                target="_blank"
            >*vocal duration that corresponds to the transcript</a></span>
            <span><a
                href={linkFragment('about.html', 'About Voxit: Vocal Analysis Tools', 'about-voxit')}
                title="Click for more information about Voxit"
                target="_blank"
            >Prosodic measures are calculated using Voxit</a></span>
        </section>
    );
}

export default TableSection;