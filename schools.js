/**
 * Schools Data - U.S. Colleges and Universities
 * 
 * This file contains a comprehensive list of schools for the autocomplete feature.
 * Data structure: { id, name, city, state }
 * 
 * TODO: Replace with real dataset from College Scorecard API or similar
 * Current dataset: Sample of major U.S. universities (expandable to thousands)
 */

const SCHOOLS_DATA = [
    // Big Ten Conference
    { id: "umich", name: "University of Michigan", city: "Ann Arbor", state: "MI" },
    { id: "msu", name: "Michigan State University", city: "East Lansing", state: "MI" },
    { id: "osu", name: "Ohio State University", city: "Columbus", state: "OH" },
    { id: "psu", name: "Penn State University", city: "University Park", state: "PA" },
    { id: "wisc", name: "University of Wisconsin", city: "Madison", state: "WI" },
    { id: "indiana", name: "Indiana University", city: "Bloomington", state: "IN" },
    { id: "purdue", name: "Purdue University", city: "West Lafayette", state: "IN" },
    { id: "uiuc", name: "University of Illinois", city: "Urbana-Champaign", state: "IL" },
    { id: "northwestern", name: "Northwestern University", city: "Evanston", state: "IL" },
    { id: "iowa", name: "University of Iowa", city: "Iowa City", state: "IA" },
    { id: "minn", name: "University of Minnesota", city: "Minneapolis", state: "MN" },
    { id: "nebraska", name: "University of Nebraska", city: "Lincoln", state: "NE" },
    { id: "rutgers", name: "Rutgers University", city: "New Brunswick", state: "NJ" },
    { id: "umd", name: "University of Maryland", city: "College Park", state: "MD" },

    // Ivy League
    { id: "harvard", name: "Harvard University", city: "Cambridge", state: "MA" },
    { id: "yale", name: "Yale University", city: "New Haven", state: "CT" },
    { id: "princeton", name: "Princeton University", city: "Princeton", state: "NJ" },
    { id: "columbia", name: "Columbia University", city: "New York", state: "NY" },
    { id: "upenn", name: "University of Pennsylvania", city: "Philadelphia", state: "PA" },
    { id: "brown", name: "Brown University", city: "Providence", state: "RI" },
    { id: "dartmouth", name: "Dartmouth College", city: "Hanover", state: "NH" },
    { id: "cornell", name: "Cornell University", city: "Ithaca", state: "NY" },

    // SEC
    { id: "alabama", name: "University of Alabama", city: "Tuscaloosa", state: "AL" },
    { id: "auburn", name: "Auburn University", city: "Auburn", state: "AL" },
    { id: "florida", name: "University of Florida", city: "Gainesville", state: "FL" },
    { id: "uga", name: "University of Georgia", city: "Athens", state: "GA" },
    { id: "kentucky", name: "University of Kentucky", city: "Lexington", state: "KY" },
    { id: "lsu", name: "Louisiana State University", city: "Baton Rouge", state: "LA" },
    { id: "ole-miss", name: "University of Mississippi", city: "Oxford", state: "MS" },
    { id: "msu-sec", name: "Mississippi State University", city: "Starkville", state: "MS" },
    { id: "mizzou", name: "University of Missouri", city: "Columbia", state: "MO" },
    { id: "sc", name: "University of South Carolina", city: "Columbia", state: "SC" },
    { id: "tennessee", name: "University of Tennessee", city: "Knoxville", state: "TN" },
    { id: "vanderbilt", name: "Vanderbilt University", city: "Nashville", state: "TN" },
    { id: "texas-am", name: "Texas A&M University", city: "College Station", state: "TX" },
    { id: "arkansas", name: "University of Arkansas", city: "Fayetteville", state: "AR" },

    // ACC
    { id: "duke", name: "Duke University", city: "Durham", state: "NC" },
    { id: "unc", name: "University of North Carolina", city: "Chapel Hill", state: "NC" },
    { id: "nc-state", name: "North Carolina State University", city: "Raleigh", state: "NC" },
    { id: "wake-forest", name: "Wake Forest University", city: "Winston-Salem", state: "NC" },
    { id: "clemson", name: "Clemson University", city: "Clemson", state: "SC" },
    { id: "fsu", name: "Florida State University", city: "Tallahassee", state: "FL" },
    { id: "miami", name: "University of Miami", city: "Coral Gables", state: "FL" },
    { id: "gt", name: "Georgia Tech", city: "Atlanta", state: "GA" },
    { id: "uva", name: "University of Virginia", city: "Charlottesville", state: "VA" },
    { id: "vt", name: "Virginia Tech", city: "Blacksburg", state: "VA" },
    { id: "pitt", name: "University of Pittsburgh", city: "Pittsburgh", state: "PA" },
    { id: "bc", name: "Boston College", city: "Chestnut Hill", state: "MA" },
    { id: "syracuse", name: "Syracuse University", city: "Syracuse", state: "NY" },
    { id: "louisville", name: "University of Louisville", city: "Louisville", state: "KY" },

    // Pac-12 / West Coast
    { id: "stanford", name: "Stanford University", city: "Stanford", state: "CA" },
    { id: "berkeley", name: "UC Berkeley", city: "Berkeley", state: "CA" },
    { id: "ucla", name: "UCLA", city: "Los Angeles", state: "CA" },
    { id: "usc", name: "University of Southern California", city: "Los Angeles", state: "CA" },
    { id: "ucsd", name: "UC San Diego", city: "San Diego", state: "CA" },
    { id: "uci", name: "UC Irvine", city: "Irvine", state: "CA" },
    { id: "ucsb", name: "UC Santa Barbara", city: "Santa Barbara", state: "CA" },
    { id: "ucd", name: "UC Davis", city: "Davis", state: "CA" },
    { id: "ucr", name: "UC Riverside", city: "Riverside", state: "CA" },
    { id: "ucsc", name: "UC Santa Cruz", city: "Santa Cruz", state: "CA" },
    { id: "caltech", name: "California Institute of Technology", city: "Pasadena", state: "CA" },
    { id: "oregon", name: "University of Oregon", city: "Eugene", state: "OR" },
    { id: "oregon-state", name: "Oregon State University", city: "Corvallis", state: "OR" },
    { id: "washington", name: "University of Washington", city: "Seattle", state: "WA" },
    { id: "wsu", name: "Washington State University", city: "Pullman", state: "WA" },
    { id: "arizona", name: "University of Arizona", city: "Tucson", state: "AZ" },
    { id: "asu", name: "Arizona State University", city: "Tempe", state: "AZ" },
    { id: "colorado", name: "University of Colorado", city: "Boulder", state: "CO" },
    { id: "utah", name: "University of Utah", city: "Salt Lake City", state: "UT" },

    // Big 12
    { id: "texas", name: "University of Texas", city: "Austin", state: "TX" },
    { id: "oklahoma", name: "University of Oklahoma", city: "Norman", state: "OK" },
    { id: "osu-bigxii", name: "Oklahoma State University", city: "Stillwater", state: "OK" },
    { id: "tcu", name: "Texas Christian University", city: "Fort Worth", state: "TX" },
    { id: "baylor", name: "Baylor University", city: "Waco", state: "TX" },
    { id: "texas-tech", name: "Texas Tech University", city: "Lubbock", state: "TX" },
    { id: "kansas", name: "University of Kansas", city: "Lawrence", state: "KS" },
    { id: "ksu", name: "Kansas State University", city: "Manhattan", state: "KS" },
    { id: "iowa-state", name: "Iowa State University", city: "Ames", state: "IA" },
    { id: "wvu", name: "West Virginia University", city: "Morgantown", state: "WV" },

    // Other Major Universities
    { id: "mit", name: "Massachusetts Institute of Technology", city: "Cambridge", state: "MA" },
    { id: "chicago", name: "University of Chicago", city: "Chicago", state: "IL" },
    { id: "nyu", name: "New York University", city: "New York", state: "NY" },
    { id: "bu", name: "Boston University", city: "Boston", state: "MA" },
    { id: "northeastern", name: "Northeastern University", city: "Boston", state: "MA" },
    { id: "carnegie-mellon", name: "Carnegie Mellon University", city: "Pittsburgh", state: "PA" },
    { id: "notre-dame", name: "University of Notre Dame", city: "Notre Dame", state: "IN" },
    { id: "rice", name: "Rice University", city: "Houston", state: "TX" },
    { id: "emory", name: "Emory University", city: "Atlanta", state: "GA" },
    { id: "wash-u", name: "Washington University in St. Louis", city: "St. Louis", state: "MO" },
    { id: "georgetown", name: "Georgetown University", city: "Washington", state: "DC" },
    { id: "tufts", name: "Tufts University", city: "Medford", state: "MA" },
    { id: "case-western", name: "Case Western Reserve University", city: "Cleveland", state: "OH" },
    { id: "tulane", name: "Tulane University", city: "New Orleans", state: "LA" },
    { id: "uf", name: "University of Florida", city: "Gainesville", state: "FL" },
    { id: "ucf", name: "University of Central Florida", city: "Orlando", state: "FL" },
    { id: "usf", name: "University of South Florida", city: "Tampa", state: "FL" },
    { id: "fiu", name: "Florida International University", city: "Miami", state: "FL" },
    { id: "uh", name: "University of Houston", city: "Houston", state: "TX" },
    { id: "smu", name: "Southern Methodist University", city: "Dallas", state: "TX" },
    { id: "gw", name: "George Washington University", city: "Washington", state: "DC" },
    { id: "american", name: "American University", city: "Washington", state: "DC" },
    { id: "howard", name: "Howard University", city: "Washington", state: "DC" },
    { id: "temple", name: "Temple University", city: "Philadelphia", state: "PA" },
    { id: "drexel", name: "Drexel University", city: "Philadelphia", state: "PA" },
    { id: "villanova", name: "Villanova University", city: "Villanova", state: "PA" },
    { id: "lehigh", name: "Lehigh University", city: "Bethlehem", state: "PA" },
    { id: "rochester", name: "University of Rochester", city: "Rochester", state: "NY" },
    { id: "rpi", name: "Rensselaer Polytechnic Institute", city: "Troy", state: "NY" },
    { id: "uconn", name: "University of Connecticut", city: "Storrs", state: "CT" },
    { id: "umass", name: "University of Massachusetts", city: "Amherst", state: "MA" },
    { id: "uri", name: "University of Rhode Island", city: "Kingston", state: "RI" },
    { id: "unh", name: "University of New Hampshire", city: "Durham", state: "NH" },
    { id: "uvm", name: "University of Vermont", city: "Burlington", state: "VT" },
    { id: "umaine", name: "University of Maine", city: "Orono", state: "ME" },
    { id: "delaware", name: "University of Delaware", city: "Newark", state: "DE" },
    { id: "cincinnati", name: "University of Cincinnati", city: "Cincinnati", state: "OH" },
    { id: "toledo", name: "University of Toledo", city: "Toledo", state: "OH" },
    { id: "akron", name: "University of Akron", city: "Akron", state: "OH" },
    { id: "miami-oh", name: "Miami University", city: "Oxford", state: "OH" },
    { id: "bgsu", name: "Bowling Green State University", city: "Bowling Green", state: "OH" },
    { id: "wayne-state", name: "Wayne State University", city: "Detroit", state: "MI" },
    { id: "western-mich", name: "Western Michigan University", city: "Kalamazoo", state: "MI" },
    { id: "central-mich", name: "Central Michigan University", city: "Mount Pleasant", state: "MI" },
    { id: "eastern-mich", name: "Eastern Michigan University", city: "Ypsilanti", state: "MI" },
    { id: "niu", name: "Northern Illinois University", city: "DeKalb", state: "IL" },
    { id: "siu", name: "Southern Illinois University", city: "Carbondale", state: "IL" },
    { id: "uic", name: "University of Illinois Chicago", city: "Chicago", state: "IL" },
    { id: "depaul", name: "DePaul University", city: "Chicago", state: "IL" },
    { id: "loyola-chicago", name: "Loyola University Chicago", city: "Chicago", state: "IL" },
    { id: "marquette", name: "Marquette University", city: "Milwaukee", state: "WI" },
    { id: "uwm", name: "University of Wisconsin Milwaukee", city: "Milwaukee", state: "WI" },
    { id: "umn-duluth", name: "University of Minnesota Duluth", city: "Duluth", state: "MN" },
    { id: "ndsu", name: "North Dakota State University", city: "Fargo", state: "ND" },
    { id: "und", name: "University of North Dakota", city: "Grand Forks", state: "ND" },
    { id: "sdsu", name: "South Dakota State University", city: "Brookings", state: "SD" },

    // Add more schools here...
    // TODO: Expand this list to include all accredited U.S. colleges
    // Data source options:
    // 1. College Scorecard API: https://collegescorecard.ed.gov/data/
    // 2. IPEDS (Integrated Postsecondary Education Data System)
    // 3. Carnegie Classification database
];

/**
 * Get all schools
 * @returns {Array} Array of all school objects
 */
function getAllSchools() {
    return SCHOOLS_DATA;
}

/**
 * Search schools by name (case-insensitive)
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum number of results to return (default: 10)
 * @returns {Array} Array of matching school objects
 */
function searchSchools(query, maxResults = 10) {
    if (!query || query.trim().length < 2) {
        return [];
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Filter schools that match the query
    const matches = SCHOOLS_DATA.filter(school => {
        const nameMatch = school.name.toLowerCase().includes(searchTerm);
        const cityMatch = school.city.toLowerCase().includes(searchTerm);
        const stateMatch = school.state.toLowerCase().includes(searchTerm);
        
        return nameMatch || cityMatch || stateMatch;
    });

    // Sort by relevance (exact matches first, then starts-with, then contains)
    matches.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Exact match
        if (aName === searchTerm) return -1;
        if (bName === searchTerm) return 1;
        
        // Starts with query
        const aStarts = aName.startsWith(searchTerm);
        const bStarts = bName.startsWith(searchTerm);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        
        // Alphabetical for remaining
        return aName.localeCompare(bName);
    });

    // Return top N results
    return matches.slice(0, maxResults);
}

/**
 * Get school by ID
 * @param {string} id - School ID
 * @returns {Object|null} School object or null if not found
 */
function getSchoolById(id) {
    return SCHOOLS_DATA.find(school => school.id === id) || null;
}

/**
 * Get school by exact name
 * @param {string} name - School name
 * @returns {Object|null} School object or null if not found
 */
function getSchoolByName(name) {
    return SCHOOLS_DATA.find(school => school.name === name) || null;
}

// Export for browser usage
if (typeof window !== 'undefined') {
    window.SchoolsData = {
        getAllSchools,
        searchSchools,
        getSchoolById,
        getSchoolByName,
        SCHOOLS_COUNT: SCHOOLS_DATA.length
    };
}

// Export for Node.js/module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getAllSchools,
        searchSchools,
        getSchoolById,
        getSchoolByName,
        SCHOOLS_COUNT: SCHOOLS_DATA.length
    };
}
