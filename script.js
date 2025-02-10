import { Octokit } from "https://esm.sh/@octokit/rest"


console.log('script.js is working');

document.querySelector('#organ').addEventListener('change', async function (e) {
    const org = e.target.value;

    const group = document.getElementById('group');
    group.innerHTML = ''; // Clear the list

    const token = document.querySelector("#token").value;

    // Create a new Octokit instance with the current token
    const octokit = new Octokit({
        auth: token,
    });

    if (org === '' || token === '') {
        // If the search bar is empty, stop here
        return;
    }

    try {
        const response = await octokit.request('GET /orgs/{org}/teams', {
            org: org
        });

        response.data.forEach(team => {
            const dropdownButton = document.createElement('button');
            dropdownButton.textContent = team.name;
            dropdownButton.className = 'dropdown';
            const caretIcon = document.createElement('i');
            caretIcon.className = 'fa fa-caret-down';
            dropdownButton.appendChild(caretIcon);

            const dropdownMenu = document.createElement('div');
            dropdownMenu.className = 'dropdown-menu';

            dropdownButton.addEventListener('click', async () => {
                // Clear the dropdown menu
                // If the dropdown menu is already visible, hide it
                if (dropdownMenu.style.display === 'block') {
                    dropdownMenu.style.display = 'none';
                    return;
                }
                dropdownMenu.innerHTML = '';
                // Otherwise, show the dropdown menu
                dropdownMenu.style.display = 'block';

                try {
                    const reposResponse = await octokit.request('GET /teams/{team_id}/repos', {
                        team_id: team.id
                    });
                    var loading = true;
                    reposResponse.data.forEach(repo => {
                        const repoItem = document.createElement('button');
                        repoItem.className = 'dropdown-item';
                       
                        repoItem.textContent = repo.name;
                        repoItem.addEventListener('click', async (event) => {
                            document.querySelector('.loader').style.display = 'block';
                            event.preventDefault(); // Prevent the default action
                            const mainDiv = document.querySelector('.main');
                            const overviewTableHeader = document.createElement('h2');
                            overviewTableHeader.textContent = 'Overview';
                            overviewTableHeader.className = 'headerButton';
                            overviewTableHeader.id = 'overviewHeader'
                            // Create a table
                            const table = document.createElement('table');
                            table.id = "overviewTable";

                            overviewTableHeader.addEventListener('click', () => {
                                if (table.style.display === 'none') {
                                    table.style.display = 'block';
                                } else {
                                    table.style.display = 'none';
                                }
                            });

                            // Create a row for the headers
                            const headerRow = document.createElement('tr');

                            // Create and append a header for each column
                            ['User Name', 'Issue', 'Pull Requests', 'Bug', 'Enhancement', 'Number of Commit', 'Number of addition', 'Performance', 'Commit record', 'AI conclusion'].forEach(headerText => {
                                const header = document.createElement('th');
                                header.textContent = headerText;
                                headerRow.appendChild(header);
                            });

                            // Append the header row to the table
                            table.appendChild(headerRow);
                    
                            // If a table already exists in the div, remove it
                            const existingTable = mainDiv.querySelector('table');
                            if (existingTable) {
                                mainDiv.removeChild(existingTable);
                            }

                            const overviewTableHead = mainDiv.querySelector('h2');
                            if (overviewTableHead) {
                                mainDiv.removeChild(overviewTableHead);
                            }



                            try {
                                const membersResponse = await octokit.request('GET /teams/{team_id}/members', {
                                    team_id: team.id
                                });

                                const memberRows = await Promise.all(membersResponse.data.map(async member => {
                                    const memberRow = document.createElement('tr');
                                    const memberCell = document.createElement('td');
                                    memberCell.textContent = member.login;
                                    memberRow.appendChild(memberCell);

                                    try {
                                        const issuesResponse = await octokit.request('GET /repos/{owner}/{repo}/issues', {
                                            owner: repo.owner.login,
                                            repo: repo.name,
                                            filter: 'all', // Get all issues
                                            state: 'all' // Get issues with any state
                                        });

                                        const issuesCount = issuesResponse.data.reduce((count, issue) => {
                                            return !issue.pull_request && issue.user.login === member.login ? count + 1 : count;
                                        }, 0);

                                        const issuesCell = document.createElement('td');
                                        issuesCell.textContent = issuesCount;
                                        memberRow.appendChild(issuesCell);


                                        const pullRequestsResponse = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
                                            owner: repo.owner.login,
                                            repo: repo.name,
                                            state: 'all'
                                        });

                                        const pullRequestsCount = pullRequestsResponse.data.filter(pullRequest => pullRequest.user.login === member.login).length;

                                        const pullRequestsCell = document.createElement('td');
                                        pullRequestsCell.textContent = pullRequestsCount;
                                        memberRow.appendChild(pullRequestsCell);


                                        const bugCount = issuesResponse.data.reduce((count, issue) => {
                                            return issue.user.login === member.login && issue.labels.some(label => label.name === 'bug') ? count + 1 : count;
                                        }, 0);

                                        const bugCell = document.createElement('td');
                                        bugCell.textContent = bugCount;
                                        memberRow.appendChild(bugCell);


                                        const enhancementCount = issuesResponse.data.reduce((count, issue) => {
                                            return issue.user.login === member.login && issue.labels.some(label => label.name === 'enhancement') ? count + 1 : count;
                                        }, 0);
                                        const enhancementCell = document.createElement('td');
                                        enhancementCell.textContent = enhancementCount;
                                        memberRow.appendChild(enhancementCell);


                                        const statsResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/contributors', {
                                            owner: repo.owner.login,
                                            repo: repo.name
                                        });

                                        const contributorStats = Array.isArray(statsResponse.data) ? statsResponse.data.find(stats => stats.author.login === member.login) : null;

                                        const commitsCount = contributorStats ? contributorStats.total : 0;
                                        const additionsCount = contributorStats ? contributorStats.weeks.reduce((total, week) => total + week.a, 0) : 0;

                                        const commitsCell = document.createElement('td');
                                        commitsCell.textContent = commitsCount;
                                        memberRow.appendChild(commitsCell);

                                        const additionsCell = document.createElement('td');
                                        additionsCell.textContent = additionsCount;
                                        memberRow.appendChild(additionsCell);

                                        // Calculate the performance score
                                        const performance = pull_check(pullRequestsCount) + bug_check(bugCount) + enh_check(enhancementCount) + commit_check(commitsCount) + addit_check(additionsCount);

                                        // Create a new cell for the performance score
                                        const performanceCell = document.createElement('td');
                                        performanceCell.textContent = performance;

                                        // Add the new cell to the row
                                        memberRow.appendChild(performanceCell);



                                        const commitResponse = await octokit.request('GET /repos/{owner}/{repo}/commits', {
                                            owner: repo.owner.login,
                                            repo: repo.name
                                        });
                                        const nameCell = document.createElement('td');
                                        const itemlist = document.createElement('ol');
                                        const commitdate = commitResponse.data.filter(commits => commits.author.login === member.login).map(commit => commit.commit.author.date);
                                        const commitmessage = commitResponse.data.filter(commits => commits.author.login === member.login).map(commit => commit.commit.message);
                                        const datemessage = commitResponse.data.filter(commits => commits.author.login === member.login).map(commit => commit.commit.message + ' :: ' + commit.commit.author.date.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }));

                                        for (let message of datemessage) {
                                            ;
                                            const item = document.createElement('li');
                                            item.textContent = message.split(':')[0];
                                            itemlist.appendChild(item);
                                            item.addEventListener('click', function () {
                                                Swal.fire({
                                                    icon: 'info',
                                                    title: 'Commit Message',
                                                    text: 'Done at ' + message.split('::')[1]
                                                });
                                            });
                                        }

                                        nameCell.appendChild(itemlist);
                                        memberRow.appendChild(nameCell);


                                        const AIcell = document.createElement('td');
                                        await fetch("https://openrouter.ai/api/v1/chat/completions", {
                                            method: "POST",
                                            headers: {
                                                "Authorization": `Bearer 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`,
                                                "Content-Type": "application/json"
                                            },
                                            body: JSON.stringify({
                                                "model": "openai/gpt-3.5-turbo-16k",
                                                "messages": [
                                                    { "role": "user", "content": "issue:" + issuesCount + " pull requests:" + pullRequestsCount + " Bug found:" + bugCount + " enhancement suggested:" + enhancementCount + " number of commits:" + commitsCount + " number of code addition:" + additionsCount + " Commit Record:" + commitmessage + " give me a conclsion based on his performance" },
                                                ],
                                            })
                                        })
                                            .then(response => response.json())
                                            .then(data => {
                                                AIcell.textContent = data.choices[0].message.content;
                                                memberRow.appendChild(AIcell);
                                            });
                                    } catch (error) {
                                        console.error(error);
                                    }

                                    return memberRow;
                                }));



                                memberRows.forEach(memberRow => table.appendChild(memberRow));

                                headerRow.querySelectorAll('th').forEach((header, i) => {
                                    header.addEventListener('click', function () {
                                        let rows = Array.from(table.rows).slice(1);

                                        rows.sort((rowA, rowB) => {
                                            let a = rowA.cells[i].textContent;
                                            let b = rowB.cells[i].textContent;

                                            if (!isNaN(a) && !isNaN(b)) {
                                                return Number(a) < Number(b) ? 1 : -1;
                                            }

                                            return a.localeCompare(b);
                                        });

                                        if (header.getAttribute('data-sorted') === 'asc') {
                                            rows.reverse();
                                            header.setAttribute('data-sorted', 'desc');
                                        } else {
                                            header.setAttribute('data-sorted', 'asc');
                                        }

                                        rows.forEach(row => table.appendChild(row));
                                    });
                                });


                            } catch (error) {
                                console.error(error);
                            }
                            mainDiv.appendChild(overviewTableHeader);
                            mainDiv.appendChild(table);

                            // If a table already exists in the div, remove it
                            const isstable1 = document.getElementById('isstable');
                            if (isstable1) {
                                mainDiv.removeChild(isstable1);
                            }

                            const head = document.getElementById('isstext');
                            if (head) {
                                mainDiv.removeChild(head);
                            }

                            const isstext = document.createElement('h2');
                            isstext.textContent = 'Issue created';
                            isstext.className = 'headerButton';
                            isstext.id = "isstext"

                            const isstable = document.createElement('table');
                            isstable.id = 'isstable';

                            isstext.addEventListener('click', () => {
                                if (isstable.style.display === 'none') {
                                    isstable.style.display = 'block';
                                } else {
                                    isstable.style.display = 'none';
                                }
                            });
                            mainDiv.appendChild(isstext);

                            // Create a row for the headers
                            const issheaderRow = document.createElement('tr');
                            const issheader = document.createElement('th');
                            issheader.textContent = 'User Name';
                            issheaderRow.appendChild(issheader);





                            try {
                                // Create and append a header for each column 
                                const isslab = await octokit.request('GET /repos/{owner}/{repo}/labels', {
                                    owner: repo.owner.login,
                                    repo: repo.name,
                                })

                                isslab.data.forEach(label => {
                                    const header = document.createElement('th');
                                    header.textContent = label.name + ' (' + label.description + ')';
                                    header.style.backgroundColor = '#' + label.color;
                                    issheaderRow.appendChild(header);
                                });

                                const issheader = document.createElement('th');
                                issheader.textContent = 'No tag';
                                issheaderRow.appendChild(issheader);
                                // Append the header row to the table
                                isstable.appendChild(issheaderRow);



                                const membersResponse = await octokit.request('GET /teams/{team_id}/members', {
                                    team_id: team.id
                                });

                                const memberRows = await Promise.all(membersResponse.data.map(async member => {
                                    const memberRow = document.createElement('tr');
                                    const memberCell = document.createElement('td');
                                    memberCell.textContent = member.login;
                                    memberRow.appendChild(memberCell);
                                    isstable.appendChild(memberRow);


                                    const issuesResponse = await octokit.request('GET /repos/{owner}/{repo}/issues', {
                                        owner: repo.owner.login,
                                        repo: repo.name,
                                        filter: 'all', // Get all issues
                                        state: 'all' // Get issues with any state
                                    });


                                    const issuecreate = issuesResponse.data.filter(issue => issue.user.login === member.login && !issue.pull_request).map(issue => issue.labels.map(label => label.name));
                                    const issuename = issuesResponse.data.filter(issue => issue.user.login === member.login && !issue.pull_request).map(issue => issue.title);
                                    const issuesStatus = issuesResponse.data.filter(issue => issue.user.login === member.login && !issue.pull_request).map(issue => issue.state);
                                    const issueMessage = issuesResponse.data.filter(issue => issue.user.login === member.login && !issue.pull_request).map(issue => issue.body);


                                    if (issuecreate.length > 0) {
                                        for (var i = 1; i < isstable.rows[0].cells.length; i++) {
                                            const issueslist = document.createElement('ul');
                                            const issuesCell = document.createElement('td');

                                            for (let j = 0; j < issuecreate.length; j++) {
                                                if (issuecreate[j].length == 0 && isstable.rows[0].cells[i].textContent == 'No tag') // Check if the labels array is empty
                                                {
                                                    const issuesitem = document.createElement('li');
                                                    if (issuesStatus[j] === 'open') {
                                                        issuesitem.classList.add('open');
                                                    }
                                                    else {
                                                        issuesitem.classList.add('closed');
                                                    }

                                                    issuesitem.textContent = issuename[j];
                                                    issueslist.appendChild(issuesitem);
                                                    issuesitem.addEventListener('click', function () {
                                                        Swal.fire({
                                                            icon: 'info',
                                                            title: 'Issue Details',
                                                            text: issueMessage[j] ? issueMessage[j] : 'null'
                                                        });
                                                    });
                                                }

                                                if (issuecreate[j].includes(isstable.rows[0].cells[i].textContent.split(' ')[0])) // Check if the label is in the labels array
                                                {
                                                    const issuesitem = document.createElement('li');
                                                    if (issuesStatus[j] === 'open') {
                                                        issuesitem.classList.add('open');
                                                    }
                                                    else {
                                                        issuesitem.classList.add('closed');
                                                    }

                                                    issuesitem.textContent = issuename[j];
                                                    issueslist.appendChild(issuesitem);
                                                    issuesitem.addEventListener('click', function () {
                                                        Swal.fire({
                                                            icon: 'info',
                                                            title: 'Issue Details',
                                                            text: issueMessage[j] ? issueMessage[j] : 'null'
                                                        });
                                                    });
                                                }
                                            }
                                            issuesCell.appendChild(issueslist);
                                            memberRow.appendChild(issuesCell);

                                        }
                                        isstable.appendChild(memberRow);
                                    }

                                }));




                            }
                            catch (error) {
                                console.error(error);
                            }
                            mainDiv.appendChild(isstable);



                            // If a table already exists in the div, remove it
                            const miletable = document.getElementById('miletable');
                            if (miletable) {
                                mainDiv.removeChild(miletable);
                            }

                            const head2 = document.getElementById('miletext');
                            if (head2) {
                                mainDiv.removeChild(head2);
                            }

                            const miletext = document.createElement('h2');
                            miletext.id = 'miletext';
                            miletext.textContent = 'Milestones';
                            miletext.className = 'headerButton';

                            const miletable1 = document.createElement('table');
                            miletable1.id = 'miletable';

                            miletext.addEventListener('click', () => {
                                if (miletable1.style.display === 'none') {
                                    miletable1.style.display = 'block';
                                } else {
                                    miletable1.style.display = 'none';
                                }
                            });
                            mainDiv.appendChild(miletext);

                            const mileheaderRow = document.createElement('tr');

                            ['Milestones Name', 'Open Issues', 'Closed Issues', 'Due Date', 'Process', 'State'].forEach(headerText => {
                                const header = document.createElement('th');
                                header.textContent = headerText;
                                mileheaderRow.appendChild(header);
                            });

                            miletable1.appendChild(mileheaderRow);

                            const mile = await octokit.request('GET /repos/{owner}/{repo}/milestones', {
                                owner: repo.owner.login,
                                repo: repo.name
                            })


                            try {
                                for (const milestone of mile.data) {
                                    const mileRow = document.createElement('tr');
                                    const mileCell = document.createElement('td');
                                    mileCell.innerHTML += milestone.title + '<br>' + 'description: ' + milestone.description;
                                    mileRow.appendChild(mileCell);
                                    miletable1.appendChild(mileRow);

                                    const openIssuesResponse = await octokit.request('GET /repos/{owner}/{repo}/issues', {
                                        owner: repo.owner.login,
                                        repo: repo.name,
                                        milestone: milestone.number,
                                        state: 'open'
                                    });
                                    const issuesResponse = await octokit.request('GET /repos/{owner}/{repo}/issues',
                                        {
                                            owner: repo.owner.login,
                                            repo: repo.name,
                                            filter: 'all', // Get all issues
                                            state: 'all' // Get issues with any state
                                        });

                                    const openIssuesCount = openIssuesResponse.data.length;
                                    const openIssuesCell = document.createElement('td');
                                    openIssuesCell.innerHTML += "total: " + openIssuesCount + "<br>";
                                    const issuelist = document.createElement('ul');
                                    for (var i = 0; i < issuesResponse.data.length; i++) {
                                        if (issuesResponse.data[i].milestone && issuesResponse.data[i].state === 'open' && issuesResponse.data[i].milestone.number === milestone.number) {
                                            const issueDetailResponse = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
                                                owner: repo.owner.login,
                                                repo: repo.name,
                                                issue_number: issuesResponse.data[i].number
                                            });

                                            const imageLinks = [];
                                            const body = issueDetailResponse.data.body;
                                            const regex = /!\[.*?\]\((.*?)\)/g;
                                            let match;
                                            while ((match = regex.exec(body)) !== null) {
                                                // The first capture group contains the URL
                                                imageLinks.push(match[1]);
                                            }
                                            const issueitem = document.createElement('li');
                                            issueitem.textContent = issuesResponse.data[i].title;
                                            issuelist.appendChild(issueitem);
                                            issueitem.addEventListener('click', function () {
                                                Swal.fire({
                                                    icon: 'info',
                                                    title: 'Issue Details',
                                                    text: issueDetailResponse.data.body ? issueDetailResponse.data.body : 'null',
                                                    imageUrl: imageLinks[0],
                                                    imageWidth: 400,
                                                    imageHeight: 200,
                                                    imageAlt: 'Custom image',
                                                });
                                            });
                                        }
                                    }
                                    openIssuesCell.appendChild(issuelist);
                                    mileRow.appendChild(openIssuesCell);



                                    const closedIssuesResponse = await octokit.request('GET /repos/{owner}/{repo}/issues', {
                                        owner: repo.owner.login,
                                        repo: repo.name,
                                        milestone: milestone.number,
                                        state: 'closed'
                                    });

                                    const closedIssuesCount = closedIssuesResponse.data.length;
                                    const closedIssuesCell = document.createElement('td');
                                    closedIssuesCell.innerHTML += "total: " + closedIssuesCount + "<br>";
                                    const closedLink = document.createElement('ul');
                                    for (var i = 0; i < issuesResponse.data.length; i++) {
                                        if (issuesResponse.data[i].milestone && issuesResponse.data[i].state === 'closed' && issuesResponse.data[i].milestone.number === milestone.number) {
                                            const issueDetailResponse = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
                                                owner: repo.owner.login,
                                                repo: repo.name,
                                                issue_number: issuesResponse.data[i].number
                                            });

                                            const closedByUser = issueDetailResponse.data.closed_by.login;
                                            const issueitem = document.createElement('li');
                                            const closedAt = new Date(issuesResponse.data[i].closed_at);
                                            const closedAtInHKTime = closedAt.toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" });
                                            if (milestone.due_on && closedAt > new Date(milestone.due_on)) {
                                                issueitem.classList.add('late');
                                            }
                                            else if (milestone.due_on && closedAt < new Date(milestone.due_on)) {
                                                issueitem.classList.add('ontime');
                                            }
                                            issueitem.textContent = issuesResponse.data[i].title + ' (closed at ' + closedAtInHKTime + ' by ' + closedByUser + ')';

                                            const imageLinks = [];
                                            const body = issueDetailResponse.data.body;
                                            const regex = /!\[.*?\]\((.*?)\)/g;
                                            let match;
                                            while ((match = regex.exec(body)) !== null) {
                                                // The first capture group contains the URL
                                                imageLinks.push(match[1]);
                                            }


                                            issueitem.addEventListener('click', function () {
                                                Swal.fire({
                                                    icon: 'info',
                                                    title: 'Issue Details',
                                                    text: issueDetailResponse.data.body ? issueDetailResponse.data.body : 'null',
                                                    imageUrl: imageLinks[0],
                                                    imageWidth: 400,
                                                    imageHeight: 200,
                                                    imageAlt: 'Custom image',
                                                });
                                            });
                                            closedLink.appendChild(issueitem);

                                        }
                                    }
                                    closedIssuesCell.appendChild(closedLink);
                                    mileRow.appendChild(closedIssuesCell);


                                    const dueDateCell = document.createElement('td');
                                    const dueDate = new Date(milestone.due_on);
                                    let lastClosedAt = new Date(Math.max.apply(null, issuesResponse.data.map(issue => new Date(issue.closed_at))));

                                    let diffDays = Math.ceil(Math.abs((lastClosedAt - dueDate) / (1000 * 60 * 60 * 24)));

                                    if (milestone.due_on && lastClosedAt > dueDate && milestone.open_issues === 0) {
                                        dueDateCell.innerHTML += new Date(milestone.due_on).toLocaleDateString() + '<br>' + ' (overdue by ' + diffDays + ' days)';
                                    }
                                    else if (milestone.due_on && lastClosedAt < dueDate && milestone.open_issues === 0) {
                                        dueDateCell.innerHTML += new Date(milestone.due_on).toLocaleDateString() + '<br>' + ' (finished by ' + diffDays + ' days before due date)';
                                    }
                                    else {
                                        dueDateCell.innerHTML += new Date(milestone.due_on).toLocaleDateString();
                                    }
                                    mileRow.appendChild(dueDateCell);

                                    const processCell = document.createElement('td');
                                    processCell.textContent = `${Math.round((closedIssuesCount / (openIssuesCount + closedIssuesCount)) * 100)}%`;
                                    mileRow.appendChild(processCell);
                                    miletable1.appendChild(mileRow);

                                    const stateCell = document.createElement('td');
                                    if (milestone.state === 'open') {
                                        stateCell.textContent = 'Open';
                                    }
                                    else if (milestone.state === 'closed') {
                                        stateCell.innerHTML += 'Closed' + '<br>' + 'closed at ' + new Date(milestone.closed_at).toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" });
                                    }
                                    mileRow.appendChild(stateCell);
                                    miletable1.appendChild(mileRow);

                                }
                            }
                            catch (error) {
                                console.error(error);
                            }


                            mainDiv.appendChild(miletable1);






                            const weeklyCommitResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/contributors', {
                                owner: repo.owner.login,
                                repo: repo.name,
                            });

                            const weeklyCommitCounts = weeklyCommitResponse.data.map(contributor => {
                                return {
                                    name: contributor.author.login,
                                    data: contributor.weeks.map(week => week.c) //a=additions, d=deletions, c=commits
                                };
                            });
                            const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']; // Add more colors if needed

                            const datasets = weeklyCommitCounts.map((contributor, index) => {
                                return {
                                    label: contributor.name,
                                    data: contributor.data,
                                    backgroundColor: colors[index % colors.length], // Use a different color for each dataset
                                    borderColor: colors[index % colors.length],
                                    borderWidth: 1
                                };
                            });

                            const labels = Array.from({ length: datasets[0].data.length }, (_, i) => `Week ${i + 1}`);


                            const chartDiv = document.querySelector('.chart');
                            const chartCanvas = document.createElement('canvas');
                            chartCanvas.id = 'Chart';
                            const existingChart = chartDiv.querySelector('canvas');
                            if (existingChart) {
                                chartDiv.removeChild(existingChart);
                            }



                            chartDiv.appendChild(chartCanvas);
                            const ctx = chartCanvas.getContext('2d');

                            new Chart(ctx, {
                                type: 'bar',
                                data: {
                                    labels: labels,
                                    datasets: datasets
                                },
                                options: {
                                    plugins: {
                                        title: {
                                            font: {
                                                size: 20
                                            },
                                            display: true,
                                            text: 'Number of commits per week'
                                        }
                                    }
                                    ,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            grid: {
                                                tickSize: 1.0
                                            },
                                            ticks: {
                                                // Include a check for making sure only integers are displayed
                                                callback: function (value) {
                                                    if (Number.isInteger(value)) {
                                                        return value;
                                                    }
                                                },
                                            }
                                        }
                                    }
                                }

                            });

                            const codeFrequencyResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/code_frequency', {
                                owner: repo.owner.login,
                                repo: repo.name,
                            });

                            const labels1 = codeFrequencyResponse.data.map(weekData => new Date(weekData[0] * 1000).toISOString().slice(0, 10));
                            const additions = codeFrequencyResponse.data.map(weekData => weekData[1]);
                            const deletions = codeFrequencyResponse.data.map(weekData => weekData[2]);

                            const chartDiv1 = document.querySelector('.mychart');
                            const chartCanvas1 = document.createElement('canvas');
                            chartCanvas1.id = 'mychart';
                            const existingChart1 = chartDiv1.querySelector('canvas');
                            if (existingChart1) {
                                chartDiv1.removeChild(existingChart1);
                            }

                            chartDiv1.appendChild(chartCanvas1);

                            const ctx1 = chartCanvas1.getContext('2d');
                            new Chart(ctx1, {
                                type: 'line',
                                data: {
                                    labels: labels1,
                                    datasets: [{
                                        label: 'Additions',
                                        data: additions,
                                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                        borderColor: 'rgba(75, 192, 192, 1)',
                                        borderWidth: 1
                                    }, {
                                        label: 'Deletions',
                                        data: deletions,
                                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                                        borderColor: 'rgba(255, 99, 132, 1)',
                                        borderWidth: 1
                                    }]
                                },
                                options: {
                                    plugins: {
                                        title: {
                                            font: {
                                                size: 20
                                            },
                                            display: true,
                                            text: 'Code-Frequency'
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true
                                        }
                                    }
                                }
                            });


                            const contriResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/contributors', {
                                owner: repo.owner.login,
                                repo: repo.name,
                            });

                            const weeklyaddCounts = contriResponse.data
                                .filter(contributor => contributor.author.login !== 'github-classroom[bot]')
                                .map(contributor => {
                                    return {
                                        name: contributor.author.login,
                                        data: contributor.weeks.map(week => week.a) //a=additions, d=deletions, c=commits
                                    };
                                });



                            const chartDiv2 = document.querySelector('.addchart');
                            const chartCanvas2 = document.createElement('canvas');
                            chartCanvas2.id = 'addchart';
                            const existingChart2 = chartDiv2.querySelector('canvas');
                            if (existingChart2) {
                                chartDiv2.removeChild(existingChart2);
                            }

                            chartDiv2.appendChild(chartCanvas2);

                            const ctx2 = document.getElementById('addchart').getContext('2d');

                            const labels2 = weeklyaddCounts[0].data.map((_, i) => `Week ${i + 1}`);

                            const datasets2 = weeklyaddCounts.map(contributor => {
                                return {
                                    label: contributor.name,
                                    data: contributor.data,
                                    fill: false,
                                    borderColor: '#' + Math.floor(Math.random() * 16777215).toString(16), // random color
                                };
                            });

                            new Chart(ctx2, {
                                type: 'line',
                                data: {
                                    labels: labels2,
                                    datasets: datasets2,
                                },
                                options: {
                                    responsive: true,
                                    plugins: {
                                        title: {
                                            font: {
                                                size: 20
                                            },
                                            display: true,
                                            text: 'Weekly Additions by Contributor'
                                        }
                                    },
                                    tooltips: {
                                        mode: 'index',
                                        intersect: false,
                                    },
                                    hover: {
                                        mode: 'nearest',
                                        intersect: true
                                    },
                                    scales: {
                                        x: {
                                            display: true,
                                            scaleLabel: {
                                                display: true,
                                                labelString: 'Week'
                                            }
                                        },
                                        y: {
                                            display: true,
                                            scaleLabel: {
                                                display: true,
                                                labelString: 'Additions'
                                            }
                                        }
                                    }
                                }
                            });
                            loading = false;
                            document.querySelector('.main').style.display = 'block';
                            document.querySelector('.loader').style.display = 'none';
                        }); //close with click listener


                        dropdownMenu.appendChild(repoItem);

                    }); //clsoe with try foreach
                } catch (error) {
                    console.error(error);
                    loading = false;
                }

            });
            dropdownButton.appendChild(dropdownMenu);
            group.appendChild(dropdownButton);


            document.getElementById("overviewNav").addEventListener('click', async (event) => {
                if (document.getElementById('overviewHeader')) {
                    document.getElementById('overviewHeader').scrollIntoView();
                }
            });
            document.getElementById("issueNav").addEventListener('click', async (event) => {
                if (document.getElementById('isstext')) {
                    document.getElementById('isstext').scrollIntoView();
                }
            });
            document.getElementById("milestoneNav").addEventListener('click', async (event) => {
                if (document.getElementById('miletext')) {
                    document.getElementById('miletext').scrollIntoView();
                }
            });
        });
    } catch (error) {
        console.error(error);
    }
});



function pull_check(pull) {
    var score = pull * 8;
    if (score >= 20) {
        return 20;
    }
    else {
        return score;
    }
}

function bug_check(bug) {
    var score = bug * 10;
    if (score >= 20) {
        return 20;
    }
    else {
        return score;
    }
}

function enh_check(enh) {
    var score = enh * 10;
    if (score >= 20) {
        return 20;
    }
    else {
        return score;
    }
}

function commit_check(commit) {
    var score = commit * 5;
    if (score >= 20) {
        return 20;
    }
    else {
        return score;
    }
}

function addit_check(addit) {
    var score = addit / 10;
    if (score >= 20) {
        return 20;
    }
    else {
        return score;
    }
}
