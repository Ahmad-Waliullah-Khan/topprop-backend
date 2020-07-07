# !/bin/bash
# Get servers list:
set — f
# Variables from GitLab server:
# Note: They can’t have spaces!!
string=$PROD_SERVER
array=(${string//,/ })
# Iterate servers for deploy and pull last commit
# Careful with the ; https://stackoverflow.com/a/20666248/1057052
for i in "${!array[@]}"; do
  echo "Deploy project on server ${array[i]}"
  ssh centos@${array[i]} "cd ~/deployment-scripts && chmod +x deploy-api.sh && ./deploy-api.sh"
done
