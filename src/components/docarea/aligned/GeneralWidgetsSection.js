import Overview from "./Overview";
import TimesTable from "./TimesTable";

/**
 * Play button, overview, and timeframe table...
 * TODO come up with better name?
 */
function GeneralWidgetsSection(props) {

    let { setPlaying, playing, docReady } = props;

    const togglePlayPause = () => {
        setPlaying(oldPlaying => !oldPlaying);
    };

    return (
        <section className="top-section">
            <button className="play-btn" onClick={togglePlayPause} disabled={!docReady}>
                <img src={playing ? 'pause-icon.svg' : 'play-icon.svg'} alt="Play/Pause icon" />
                <span>{playing ? 'pause' : 'play'}</span>
            </button>
            <Overview {...props} />
            <TimesTable {...props} />
        </section>
    );
}

export default GeneralWidgetsSection;