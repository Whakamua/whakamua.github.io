function add_child(node, action) {
    /**
     * add a child to this node
     * @param {int} action transition action for obtaining this child
     */
    let child = new Node(node, action)
    node.children.push(child)
    node.num_children += 1
}

function expand_children(node) {
    // add children to the current node

    // randomly add children
    let children_added = int(random(3)) + 1
    let num_current_children = node.num_children
    for (let i = 0; i < children_added; i++) {
        add_child(node, num_current_children + i)
    }
    node.is_expanded = true
}

function get_U(node) {
    // PUCT = Q + U
    // this function calculates U = c * P_i * N_pˆ0.5/(1+ N_i)
    // where:
    // c is the exploration constant.
    // P_i is the prior corresponding to the current node.
    // N_p is the number of visits of the parent.
    // N_i is the number of visits of the current node.
    if (node.parent) {
        return conf.exploration_constant * node.parent.policy[node.action] * node.parent.num_visits ** 0.5 / (1 + node.num_visits)
    } else {
        return 0
    }
}

function get_Q(node) {
    // PUCT = Q + U
    // this function calculates Q(s, a) = r(s, a) + y*V(s') 
    // where:
    // s is the state of the parent of this node.
    // a is the action taken by the parent leading to this node.
    // Q(s, a) is the value of the parent selecting its first action to end up in this node. 
    // V(s') is the value of this node.
    // r(s, a) is the reward obtained from the parent selecting this node.
    return node.reward + conf.gamma * node.value
}

function get_PUCT(node) {
    // calculate PUCT = Q + U
    return get_Q(node) + get_U(node)
}

function get_best_child(node) {
    // Get the best child by maximizing the PUCT formula.

    // so that the first PUCT is always higher
    let max_PUCT = -Infinity

    // to keep track of the children that have the highest PUCT value
    let best_children = []

    for (let i = 0; i < node.num_children; i++) {
        let PUCT = get_PUCT(node.children[i])
        if (PUCT > max_PUCT) {
            best_children = [node.children[i]]
            max_PUCT = PUCT
        } else if (PUCT === max_PUCT) {
            best_children.push(node.children[i])
        }
        node.children[i].PUCT = PUCT
    }

    // sample a random best child from best_children, so that if more than 1 best child is in the
    // list the best one is randomly chosen.
    return best_children[Math.floor(Math.random() * best_children.length)]
}

function get_most_visited_node(node) {
    // get the child node that has the most number of visits

    // so that the first num visits is always higher
    let most_visits = -Infinity

    // to keep track of children that have the highest num visits
    let best_children = []

    for (let i = 0; i < node.num_children; i++) {
        if (node.children[i].num_visits > most_visits) {
            best_children = [node.children[i]]
            most_visits = node.children[i].num_visits
        } else if (node.children[i].num_visits === most_visits) {
            best_children.push(node.children[i])
        }
    }

    // sample a random best child from best_children, so that if more than 1 best child is in the
    // list the best one is randomly chosen.
    return best_children[Math.floor(Math.random() * best_children.length)]
}

function step_backpropagate(node) {
    // perform a step of backpropagation, this includes:
    // 1. updating the num visits of the node
    // 2. updating the value of the node
    // 3. use the Bellman equation to calculate the value for the parent node (backprop_value)

    
    // increment the number of visits of the node by 1 and set the value of the node.
    node.num_visits += 1
    node.value = ((node.value * (node.num_visits - 1)) + backprop_value) / (node.num_visits)
    
    // use the Bellman equation to compute the value of the parent node and store it in 
    // backprop_value.
    backprop_value = node.reward + conf.gamma * backprop_value
    
    // if the node is not the root node, i.e. it has a parent, return the parent node. 
    // Else return false.
    if (node !== root) {
        return node.parent
    } else {
        return false
    }

}

function next_root(current_root) {
    // find the most visited child of the current root and set it to be the new root.
    root = get_most_visited_node(current_root)
    // update its color
    root.set_default_color(conf.trajectory_color)

    // set the current_node to be the new root
    current_node = root
    iteration_number = 0
}

function next_root_delayed(root, delay) {
    if (delay === 0) {
        next_root(root)
    }
    setTimeout(() => {
        next_root(root)
    }, delay)
}

function get_policy_and_value(node) {
    let policy = []; policy.length = node.num_children
    let sum_policy = 0
    for (let i = 0; i < node.num_children; i++) {
        policy[i] = 1 //0.2 + random(0.8)
        sum_policy += policy[i]
    }
    for (let i = 0; i < node.num_children; i++) [
        policy[i] /= sum_policy
    ]
    var value
    // if (node.depth === conf.max_tree_depth){
    //     value = node.reward // node.reward * 1 / (1 - conf.gamma)
    // } else{
    //     value = 0
    // }
    value = conf.reward_mean * 1 / (1 - conf.gamma)
    return [policy, value]
}
