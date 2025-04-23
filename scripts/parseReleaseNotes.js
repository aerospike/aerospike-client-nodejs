const fs = require('fs');

// Function to generate markdown content
function generateMarkdown(data) {
  const markdownLines = [];

  const sections = [
    { title: 'Description', key: 'description' },
    { title: 'Breaking Changes', key: 'breaking_changes' },
    { title: 'New Features', key: 'new_features' },
    { title: 'Bug Fixes', key: 'bug_fixes' },
    { title: 'Improvements', key: 'improvements' },
    { title: 'Updates', key: 'updates' },
  ];

  for (const { title, key } of sections) {
    const content = data[key]?.trim();
    if (!content || !/^[\s*-]/m.test(content)) continue;

    const lines = content.split('\n').map(line => {
      const trimmed = line.trim();
      if (/^[-*]\s+/.test(trimmed)) {
        const indent = line.startsWith('  ') || line.startsWith('\t') ? '    ' : '  ';
        return indent + trimmed.replace(/^[-*]/, '-');
      } else {
        return '  ' + trimmed;
      }
    });

    markdownLines.push(`## ${title}`, ...lines, '');
  }

  return markdownLines.join('\n').trim() + '\n';
}


// Function to extract sections from text file content
function parseReleaseNotes(fileContent) {
  const releaseData = {
    version: '',
    date: '',
    description: '',
    breaking_changes: '',
    new_features: '',
    bug_fixes: '',
    improvements: '',
    updates: ''
  };

  const versionRegex = /version:\s*(\S+)/;
  const dateRegex = /date:\s*(\S+)/;
  const descriptionRegex = /description:\s*\|([\s\S]+?)(?=\n\s*\w+:|$)/;
  const breakingChangesRegex = /breaking_changes:\s*\|([\s\S]+?)(?=\n\s*\w+:|$)/;
  const newFeaturesRegex = /new_features:\s*\|([\s\S]+?)(?=\n\s*\w+:|$)/;
  const bugFixesRegex = /bug_fixes:\s*\|([\s\S]+?)(?=\n\s*\w+:|$)/;
  const improvementsRegex = /improvements:\s*\|([\s\S]+?)(?=\n\s*\w+:|$)/;
  const updatesRegex = /updates:\s*\|([\s\S]+?)(?=\n\s*\w+:|$)/;

  // Extract version, date, and sections using regex
  const matchVersion = fileContent.match(versionRegex);
  if (matchVersion) releaseData.version = matchVersion[1];

  const matchDate = fileContent.match(dateRegex);
  if (matchDate) releaseData.date = matchDate[1];

  const matchDescription = fileContent.match(descriptionRegex);
  if (matchDescription) releaseData.description = matchDescription[1].trim();

  const matchBreakingChanges = fileContent.match(breakingChangesRegex);
  if (matchBreakingChanges) releaseData.breaking_changes = matchBreakingChanges[1].trim();

  const matchNewFeatures = fileContent.match(newFeaturesRegex);
  if (matchNewFeatures) releaseData.new_features = matchNewFeatures[1].trim();

  const matchBugFixes = fileContent.match(bugFixesRegex);
  if (matchBugFixes) releaseData.bug_fixes = matchBugFixes[1].trim();

  const matchImprovements = fileContent.match(improvementsRegex);
  if (matchImprovements) releaseData.improvements = matchImprovements[1].trim();

  const matchUpdates = fileContent.match(updatesRegex);
  if (matchUpdates) releaseData.updates = matchUpdates[1].trim();

  return releaseData;
}

// Function to save the markdown file
function saveMarkdown(fileName, markdownContent) {
  fs.writeFile(fileName, markdownContent, (err) => {
    if (err) {
      console.error("Error writing the markdown file:", err);
    } else {
      console.log(`Release notes saved to ${fileName}`);
    }
  });
}

// Function to read input file and generate output
function processFile(inputFile, outputFile) {
  fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading the input file:", err);
      return;
    }

    const releaseData = parseReleaseNotes(data);
    const markdownContent = generateMarkdown(releaseData);
    saveMarkdown(outputFile, markdownContent);
  });
}

// Parse arguments
const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error("Please provide both input and output file names as arguments.");
  process.exit(1);
}

// Process the input file and generate the output file
processFile(inputFile, outputFile);
