function update_offspring_leaf_nodes(node) {
    /**
     * update the offspring leaf nodes for every ancestor of the node.
     */

    // amount that the offspring_leaf_nodes should increase for every ancestor
    offspring_leaf_nodes_increase = node.num_children - node.offspring_leaf_nodes
    while (node) {
        node.offspring_leaf_nodes += offspring_leaf_nodes_increase
        node = node.parent
    }

    // update the position of all nodes in the tree
    update_pos_of_children(first_root)
}

function update_offspring_leaf_nodes_delayed(node, delay) {
    if (delay === 0) {
        update_offspring_leaf_nodes(node)
        return
    }

    setTimeout(() => {
        update_offspring_leaf_nodes(node)
    }, delay)
}

function update_pos_of_children(node) {
    /**
     * Recursively go down the tree to update the position of each node.
     */

    // If there are no children, return.
    if (node.num_children === 0) {
        return
    }

    // Each child node (c) of the node (n) will be placed in the center relative to all 
    // its children (o). To initialize this functionality, the relative_child_node_pos is 
    // first set to negative half to the left of the node's (n) number of offsprings. 
    // This is -6/2=-3 in the example below. The relative_child_node_pos is now at the first bar 
    // in the example below.
    //
    // Next, a for loop, loops over all children (c1, c2) and contains 3 steps:
    // 1. Add half of the child's offsprings to relative_child_node_pos, -4 + 4/2 = -1
    //    relative_child_node_pos is now at c1. 
    // 2. Set the position of c1 to -2
    // 3. Add second half of the first child's offsprings to relative_child_node_pos, -1 + 4/2 = 1
    //    the relative_child_node_pos is now at the second bar.
    // 4. To figure out the positions of nodes lower down in the tree (o1, o2), call this same 
    //    function again for the current child_node (c1)
    // repeat the loop for the next child (c2)
    //
    //                  n _
    //                /     \
    //bars->   |    c1    | c2 |
    //            /   \      |  
    //           o1    o2    o3
    //          / \   / \   / \
    //         o4 o5 o6 o7 o8 o9

    // initialize relative_child_node_pos.
    let relative_child_node_pos = -node.offspring_leaf_nodes / 2

    for (let i = 0; i < (node.children.length); i++) {

        // 1.
        relative_child_node_pos += node.children[i].offspring_leaf_nodes / 2

        // 2.
        node.children[i].update_x_based_on_num_nodes_offset_from_parent(relative_child_node_pos)

        // 3.
        relative_child_node_pos += node.children[i].offspring_leaf_nodes / 2

        // 4.        
        update_pos_of_children(node.children[i])

    }
}

function show_tree(node) {
    /**
     * Recursively go down the tree and draw each node.
     */
    node.draw_node()
    for (let i = 0; i < (node.children.length); i++) {
        show_tree(node.children[i])
    }
}

function node_add_color_layer_delayed(node, delay, color) {
    if (delay === 0) {
        node.add_color_layer(color)
        return
    }
    setTimeout(() => {
        node.add_color_layer(color)
    }, delay)
}

function node_remove_color_layer_delayed(node, delay) {
    if (delay === 0) {
        node.remove_color_layer()
        return
    }
    setTimeout(() => {
        node.remove_color_layer()
    }, delay)
}

function node_unhide_children_delayed(node, delay) {
    if (delay === 0) {
        node.hide_children = false
        return
    }
    setTimeout(() => {
        node.hide_children = false
    }, delay)
}

