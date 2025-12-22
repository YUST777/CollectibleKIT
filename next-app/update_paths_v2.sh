#!/bin/bash
cd /home/yousefmsm1/Desktop/ICPCHUE-next/next-app

replace_img() {
    old=$1
    new=$2
    echo "Replacing $old with $new..."
    grep -rl --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git "$old" . | xargs -r sed -i "s|$old|$new|g"
}

# Achievements Moves
replace_img "/images/achievements/done_approvalcamp.webp" "/images/achievements/done_approvalcamp.webp"
replace_img "/images/achievements/instructor.webp" "/images/achievements/instructor.webp"
replace_img "/images/achievements/WELCOME.webp" "/images/achievements/WELCOME.webp"

# Lessons -> Approval Subfolder
replace_img "/images/lessons/approval/approvalcamp.webp" "/images/lessons/approval/approvalcamp.webp"
replace_img "/images/lessons/approval/conditions.webp" "/images/lessons/approval/conditions.webp"
replace_img "/images/lessons/approval/control-flow.webp" "/images/lessons/approval/control-flow.webp"
replace_img "/images/lessons/approval/revision.webp" "/images/lessons/approval/revision.webp"

# Lessons -> Winter Subfolder
replace_img "/images/lessons/winter/complexity.webp" "/images/lessons/winter/complexity.webp"
replace_img "/images/lessons/winter/wintercamp.webp" "/images/lessons/winter/wintercamp.webp"

# Sheet Subfolder
replace_img "/images/sheet/sheet1.webp" "/images/sheet/sheet1.webp"

echo "Paths updated."
