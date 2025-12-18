import React from 'react';
import { format } from 'date-fns';

interface DiseaseRow {
    id: number;
    name: string;
    isNotifiable: boolean;
    suspected: {
        '0-14': { m: string; f: string };
        '15-24': { m: string; f: string };
        '25-64': { m: string; f: string };
        '65+': { m: string; f: string };
    };
    deaths: {
        '0-14': { m: string; f: string };
        '15-24': { m: string; f: string };
        '25-64': { m: string; f: string };
        '65+': { m: string; f: string };
    };
    samples: string;
    confirmed: string;
}

interface DiseaseReportTemplateProps {
    data: DiseaseRow[];
    metadata: {
        facilityName?: string;
        region?: string;
        healthDistrict?: string;
        healthArea?: string;
        year?: string;
        epidemiologicalWeek?: string;
        submissionDate?: string;
        receivedDate?: string;
        submitterName?: string;
    };
}

export const DiseaseReportTemplate = React.forwardRef<HTMLDivElement, DiseaseReportTemplateProps>(
    ({ data, metadata }, ref) => {
        return (
            <div ref={ref} className="flex flex-col item-center " style={styles.page}>
                {/* ===== TRI-COLUMN HEADER ===== */}
                <div style={styles.header}>
                    {/* Left Column - French */}
                    <div style={styles.headerLeft} className='flex flex-col justify-center items-center'>
                        <p style={styles.headerText}>République du Cameroun</p>
                        <p style={styles.headerText}>MINISTERE DE LA SANTE PUBLIQUE</p>
                    </div>

                    {/* Center Column - Logo */}
                    <div style={styles.headerCenter}>
                        <div className='h-[50px] w-[50px]'>
                            <img src="/images/healthlogo.png" alt="health-logo" />
                        </div>
                    </div>

                    {/* Right Column - English */}
                    <div style={styles.headerRight} className='flex flex-col justify-center items-center'>
                        <p style={styles.headerText}>Republic of Cameroon</p>
                        <p style={styles.headerText}>MINISTRY OF PUBLIC HEALTH</p>
                    </div>
                </div>

                {/* ===== SUBTITLE ===== */}
                <div style={styles.subtitle} className='flex flex-col justify-center items-center gap-1 bg-gray-100 py-1 px-1'>
                    <h2 className='text-[8px] font-bold'>TICHE DE NOTIFICATION HEBDOMADAIRE DES MALADIES APOTENTIEL EPIDEMIQUE, AFFECTIONS PRIORITAIRES ET AUTRES EVENMENTS DE SANTE PUBLIQUE</h2>
                    <h2 className='text-[8px] font-bold'>FORM FOR WEEKLY NTIFICATION OF SURVEILLANCE OF EPIDEMIC PRONE DISEASES, PRIORITY CONDITIONS AND OTHER PUBLIC HEALTH EVENTS </h2>
                    <p className='text-[7px]'>(Fiche niceau de la Formation Sanitaire/ Health Unit's Form)</p>
                </div>

                {/* ===== FORM SECTIONS ===== */}
                <div style={styles.formSection} className='flex justify-between gap-2'>
                    {/* Section 1 */}
                    <div style={styles.formRow} className='flex items-center justify-center flex-col space-y-6'>
                        <div className='flex items-center justify-center flex-col'>
                            <strong className='text-[7px] pb-[4px]'>Région / Region:</strong>
                            <input type="text" className='border border-black py-1 px-4 bg-gray-200 text-[7px]' />
                        </div>
                        <div style={styles.formField} className='flex items-center justify-center flex-col'>
                            <strong className='text-[7px] pb-[4px]'>Semaine Épidémiologique / Week:</strong>
                            <input type="text" className='border border-black py-1 px-4 bg-gray-200 text-[7px]' />
                        </div>
                    </div>

                    {/* Section 2 */}
                    <div style={styles.formRow} className='flex items-center justify-center flex-col'>
                        <div style={styles.formFieldFull} className='flex items-center justify-center flex-col'>
                            <strong className='text-[7px] pb-[4px]'>District Santé / Health District:</strong>
                            <input type="text" className='border border-black py-1 px-4 w-[200px] bg-gray-200 text-[7px]' />
                        </div>
                        <div style={styles.formFieldFull} className='flex items-center justify-center flex-col'>
                            <strong className='text-nowrap text-[7px] pb-[4px]'>Nom de la Formation Santaire / Name of the Health Unit:</strong>
                            <input type="text" className='border border-black py-1 px-4 w-[220px] bg-gray-200 text-[7px]' />
                        </div>
                        <div style={styles.formFieldFull} className='flex items-center justify-center gap-2'>
                            <strong className='text-[7px] pb-[4px]'>De / From</strong>
                            <input type="text" className='border border-black py-1 px-3 w-[100px] bg-gray-200 text-[7px]' />
                        </div>
                    </div>

                    {/* Section 3 */}
                    <div style={styles.formRow} className='flex items-center justify-center flex-col'>
                        <div style={styles.formField} className='flex items-center justify-center flex-col'>
                            <strong className='text-[7px] pb-[4px]'>Aire de Santé / Health Area:</strong>
                            <input type="text" className='border border-black py-1 px-4 w-[200px] bg-gray-200 text-[7px]' />
                        </div>
                        <div style={styles.formFieldSmall} className='flex items-center justify-center flex-col'>
                            <strong className='text-[7px] pb-[4px]'>Année / Year:</strong>
                            <input type="text" className='border border-black py-1 px-4 w-[100px] bg-gray-200 text-[7px]' />
                        </div>
                        <div style={styles.formFieldSmall} className='flex items-center justify-center relative'>
                            <strong className='absolute top-1/4 -left-11 text-[7px]'>Au / To:</strong>
                            <input type="text" className='border border-black py-1 px-3 w-[100px] bg-gray-200 text-[7px]' />
                        </div>
                    </div>
                </div>

                {/* ===== DISEASE TABLE ===== */}
                <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                        <thead>
                            {/* Header Row 1 - Main Categories */}
                            <tr>
                                <th rowSpan={3} style={{ ...styles.th, width: '25px' }}>
                                    No
                                </th>
                                <th rowSpan={3} style={{ ...styles.th, width: '130px', textAlign: 'left' }}>
                                    MALADIES
                                </th>
                                <th colSpan={8} style={styles.thMain}>
                                    SUSPECTED CASES
                                </th>
                                <th colSpan={8} style={styles.thMain}>
                                    DEATHS
                                </th>
                                <th rowSpan={3} style={{ ...styles.th, width: '40px' }}>
                                    Sample Cases
                                </th>
                                <th rowSpan={3} style={{ ...styles.th, width: '40px' }}>
                                    Confirmed
                                </th>
                            </tr>

                            {/* Header Row 2 - Age Groups */}
                            <tr>
                                <th colSpan={2} style={styles.thAge}>0-14</th>
                                <th colSpan={2} style={styles.thAge}>15-24</th>
                                <th colSpan={2} style={styles.thAge}>25-64</th>
                                <th colSpan={2} style={styles.thAge}>65+</th>
                                <th colSpan={2} style={styles.thAge}>0-14</th>
                                <th colSpan={2} style={styles.thAge}>15-24</th>
                                <th colSpan={2} style={styles.thAge}>25-64</th>
                                <th colSpan={2} style={styles.thAge}>65+</th>
                            </tr>

                            {/* Header Row 3 - Gender */}
                            <tr>
                                {[...Array(16)].map((_, i) => (
                                    <th key={i} style={styles.thGender}>
                                        {i % 2 === 0 ? 'M' : 'F'}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {data.map((row) => (
                                <tr key={row.id}>
                                    <td style={styles.td}>{row.id.toString().padStart(2, '0')}</td>
                                    <td style={{ ...styles.td, textAlign: 'left' }}>
                                        {row.name}
                                        {row.isNotifiable ? ' *' : ''}
                                    </td>
                                    {/* Suspected Cases */}
                                    <td style={styles.td}>{row.suspected['0-14'].m}</td>
                                    <td style={styles.td}>{row.suspected['0-14'].f}</td>
                                    <td style={styles.td}>{row.suspected['15-24'].m}</td>
                                    <td style={styles.td}>{row.suspected['15-24'].f}</td>
                                    <td style={styles.td}>{row.suspected['25-64'].m}</td>
                                    <td style={styles.td}>{row.suspected['25-64'].f}</td>
                                    <td style={styles.td}>{row.suspected['65+'].m}</td>
                                    <td style={styles.td}>{row.suspected['65+'].f}</td>
                                    {/* Deaths */}
                                    <td style={styles.td}>{row.deaths['0-14'].m}</td>
                                    <td style={styles.td}>{row.deaths['0-14'].f}</td>
                                    <td style={styles.td}>{row.deaths['15-24'].m}</td>
                                    <td style={styles.td}>{row.deaths['15-24'].f}</td>
                                    <td style={styles.td}>{row.deaths['25-64'].m}</td>
                                    <td style={styles.td}>{row.deaths['25-64'].f}</td>
                                    <td style={styles.td}>{row.deaths['65+'].m}</td>
                                    <td style={styles.td}>{row.deaths['65+'].f}</td>
                                    {/* Sample and Confirmed */}
                                    <td style={styles.td}>{row.samples}</td>
                                    <td style={styles.td}>{row.confirmed}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-[8px] font-bold mt-">* Maladie a notification immediate/ Immediate notification diseases</p>

                {/* ===== FOOTER SECTION ===== */}
                <div style={styles.footer}>
                    <div style={styles.footerRow} className="flex">
                        <div style={styles.footerField}>
                            <div className='text-nowrap text-[8px]'>Date d'envoi a L'Aire de Sante/ Date of Submision to the Health Area: ...........</div>
                        </div>
                        <div style={styles.footerField}>
                            <div className='text-nowrap text-[8px]'>Date de Reception/ Date of Reception: ............</div>
                        </div>
                        <div style={styles.footerField}>
                            <div className='text-nowrap text-[8px]'>Nom, Signature et cache/ Name, Signature and Round Stamp</div>
                        </div>
                    </div>

                    <section className='p-0 mt-2'>
                        <div className='p-0 m-0 flex gap-1 items-center'>
                            <div className='border border-black py-1.5 bg-gray-300 w-[180px]' />
                            <span className="text-black text-[8px] relative bottom-1">Zone reservee au Ds</span>
                        </div>
                        <div className='p-0 m-0 flex gap-1 items-center'>
                            <div className='border-x py-1.5 border-black w-[180px]' />
                            <span className="text-black text-[8px] relative bottom-1">Zone reservee a la FOSA</span>
                        </div>
                        <div className='p-0 m-0 flex gap-1 items-center'>
                            <div className='border border-black py-1.5 bg-black w-[180px]' />
                            <span className="text-black text-[8px] relative bottom-1">Aucun remplissage</span>
                        </div>
                    </section>
                </div>
            </div>
        );
    }
);

DiseaseReportTemplate.displayName = 'DiseaseReportTemplate';

// Styles object for the PDF template - Optimized for A4
const styles: { [key: string]: React.CSSProperties } = {

    page: {
        width: '210mm',
        minHeight: '297mm',
        padding: '8mm',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif',
        fontSize: '9pt',
        color: '#000',
        boxSizing: 'border-box',
    },

    // Header styles
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '0px',
        fontSize: '8pt',
    },
    headerLeft: {
        textAlign: 'left',
        flex: 1,
    },
    headerCenter: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRight: {
        textAlign: 'right',
        flex: 1,
    },
    headerText: {
        margin: '1px 0',
        fontWeight: 'bold',
        fontSize: '8pt',
    },
    logoPlaceholder: {
        width: '50px',
        height: '50px',
        border: '1px solid #000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '7pt',
    },

    // Subtitle
    subtitle: {
        textAlign: 'center',
        marginBottom: '0px',
    },

    // Form sections
    formSection: {
        marginBottom: '0px',
        fontSize: '7pt',
    },
    formRow: {
        display: 'flex',
        gap: '6px',
        marginBottom: '4px',
        marginTop: '4px',
    },
    formField: {
        flex: 1,
    },
    formFieldFull: {
        width: '100%',
    },
    formFieldSmall: {
        flex: '0 0 auto',
        minWidth: '100px',
    },

    // Table styles
    tableWrapper: {
        marginBottom: '0px',
        overflowX: 'auto',
        height: '100%',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '6.5pt',
        border: '1px solid #000',
    },
    th: {
        border: '1px solid #000',
        padding: '5px 2px',
        backgroundColor: '#e8e8e8',
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        fontSize: '6.5pt',
        lineHeight: '1.3',
    },
    thMain: {
        border: '1px solid #000',
        padding: '5px 2px',
        backgroundColor: '#d0d0d0',
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        fontSize: '6.5pt',
        lineHeight: '1.3',
    },
    thAge: {
        border: '1px solid #000',
        padding: '5px 2px',
        backgroundColor: '#e8e8e8',
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        fontSize: '6pt',
        lineHeight: '1.3',
        paddingTop: '0',

    },
    thGender: {
        border: '1px solid #000',
        padding: '5px 2px',
        paddingTop: '0',
        backgroundColor: '#e8e8e8',
        fontWeight: 'bold',
        textAlign: 'center',
        verticalAlign: 'middle',
        fontSize: '6pt',
        lineHeight: '1.3',
    },
    td: {
        border: '1px solid #000',
        padding: '8px 2px',
        paddingTop: '0px',
        textAlign: 'center',
        verticalAlign: 'middle',
        fontSize: '6.5pt',
        lineHeight: '1.3',
    },

    // Footer styles
    footer: {
        marginTop: '10px',
    },
    footerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '0px',
        fontSize: '7pt',
    },
    footerField: {
        flex: 1,
    },
    footerLabel: {
        fontWeight: 'bold',
        marginBottom: '2px',
        fontSize: '7pt',
    },
    footerValue: {
        borderBottom: '1px solid #000',
        minHeight: '18px',
    },
    signatureBox: {
        border: '1px solid #000',
        height: '35px',
        marginTop: '2px',
    },
    footerNote: {
        textAlign: 'center',
        fontSize: '7pt',
        fontStyle: 'italic',
    },
};

export default DiseaseReportTemplate;