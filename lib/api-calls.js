module.exports = { getReposList, createPr, getRepoDefaultBranch };

const core = require('@actions/core');

async function getReposList(octokit, name, owner) {
  const { data: { items } } = await octokit.search.code({
    q: `"${name}" user:${owner} in:file filename:package.json`
  });
  
  core.debug(JSON.stringify(items, null, 2));

  // Groups paths by repository id
  const result = items.reduce((acc, item) => {
    const index = acc.findIndex(repo => repo.repository.id === item.repository.id);
    const path = item.path;
    delete item.path;
    if (index === -1) {
      acc.push({ ...item, paths: [path] });
    } else {
      acc[index].paths.push(path);
    }

    return acc;
  }, []);

  core.debug(JSON.stringify(result, null, 2));

  return result;
}

async function createPr(octokit, branchName, id, commitMessage, defaultBranch) {
  const createPrMutation =
    `mutation createPr($branchName: String!, $id: ID!, $commitMessage: String!, $defaultBranch: String!) {
      createPullRequest(input: {
        baseRefName: $defaultBranch,
        headRefName: $branchName,
        title: $commitMessage,
        repositoryId: $id
      }){
        pullRequest {
          url
        }
      }
    }
    `;

  const newPrVariables = {
    branchName,
    id,
    commitMessage,
    defaultBranch
  };

  const { createPullRequest: { pullRequest: { url: pullRequestUrl } } } = await octokit.graphql(createPrMutation, newPrVariables);

  return pullRequestUrl;
}

async function getRepoDefaultBranch(octokit, repo, owner) {
  const { data: { default_branch } } = await octokit.repos.get({
    owner,
    repo
  });

  return default_branch;
}
