function setup() {
    randomSeed(23)
    pixelDensity(2)
    createCanvas(800, 800)

    conf = {} // configuration dict

    // Set mouse position as not being pressed and reset the frame offset.
    mouse_being_pressed = false
    reset_frame_offset()

    // animation
    // To make the animation of highlighting nodes not all instant. A delay is added between each
    // highlight that is displayed.
    delay = 0 // keeps track of after how much delay each animation needs to be displayed.
    step_delay = 50 // delay between each animation step
    conf.node_size = 60 // diameter of the node on display
    conf.trajectory_color = [255, 0, 0] // rgb color of nodes in chosen trajectory

    // mcts hyperparams
    conf.gamma = 0.8 // discount factor
    conf.max_tree_depth = 3 // maximum tree search depth for mcts
    conf.exploration_constant = 1 // exploration constant in the PUCT formula
    conf.max_iterations = 20000 // number of iterations per search

    // mean and standard deviation of the rewards that are assigned 
    // randomly to newly created nodes.
    conf.reward_mean = 0
    conf.reward_std = 0.2

    // buttons:
    finish_search_button = createButton('finish_search')
    finish_search_button.position(width / 2 - 103, 0)
    finish_search_button.mousePressed(do_finish_search_button)

    finish_iteration_button = createButton('finish_iteration')
    finish_iteration_button.position(width / 2, 0)
    finish_iteration_button.mousePressed(do_finish_iteration_button)

    step_selection_button = createButton('selection')
    step_selection_button.position(width / 2 + 103, 0)
    step_selection_button.mousePressed(do_step_selection_button)

    step_backprop_button = createButton(' backprop ')
    step_backprop_button.position(width / 2 + 103, 0)
    step_backprop_button.mousePressed(do_step_backprop_button)

    // reset the tree, creating only a root node
    reset_tree()

    // test() // uncomment to run the test function
    // run_to_end()
}

function run_to_end() {
    noLoop()
    step_delay = 0
    for (let i = 0; i < conf.max_tree_depth; i++) {
        finish_search()
    }
    update_pos_of_children(first_root)
    step_delay = 50
    loop()
}

function switch_step_state_to(new_step_state) {
    if (new_step_state === "backprop") {
        step_state = "backprop"
    } else if (new_step_state === "selection"){
        // when switching to selection, this marks the end of a backpropagation step, and the 
        // iteration number is incremented by 1.
        step_state = "selection"
        iteration_number += 1
    }
}

function reset_frame_offset() {
    /**
     * Resets the frame back to its original position.
     */

    // seting the offset of the frame to x=0 and y=0
    node_offset = createVector(0, 0)
}

function reset_tree() {
    /**
     * resets the tree so that the is only 1 root node with no children.
     */

    max_return = -Infinity // initialize max return to be -inf
    second_max_return = -Infinity // initialize second max return to be -inf
    iteration_number = 0 // reset current iteration number
    first_root = new Node(null, 0) // set a new first_root node, this is the top node in the tree.
    root = first_root // set the current node to be the first_root, so mcts sees this as its root.
    root.set_default_color(conf.trajectory_color)
    current_node = root // set the current node to be the root, this node the mcts will evaluate.
    backprop_value = 0 // value that is used to update parent nodes value during backpropagation.
    one_time_mega_reward = 0 // reward given to the first node that is created at a depth equal to 
    // the max tree depth, this is to make sure that there is one clear trajectory that should 
    // dominate, this makes it possible for MCTS to find the most optimal trajectory with less 
    // iterations.
    step_state = "selection" // the step state indicates whether "selection" or "backprop" is the
    // next step to be performed. "selection" searches down in the tree until a leaf node is 
    // reached. "backprop" navigates back to the root node updating the search statistics of all 
    // nodes encountered.
}

function test() {
    /**
     * tests the MCTS and prints statistics on how often the optimal trajectory is found.
     */

    // turn off automatic looping of the draw() function. Also turn off animations.
    noLoop()
    step_delay = 0
    // amount of times to run mcts
    test_runs = 100

    // initializing some statistics
    pass = 0 // amount of times max return was found
    fail = 0 // amount of times max return was not found
    avg_diff_fail = 0 // difference between max return and second max return in failed cases
    avg_diff_pass = 0 // difference between max return and second max return in passed cases

    for (let i = 0; i < test_runs; i++) {
        // randomSeed(i)
        print("testing")

        // reset the tree and run finish_search until max tree depth is reached.
        reset_tree()
        for (let i = 0; i < conf.max_tree_depth; i++) {
            finish_search()
        }
        if (root.return === max_return) {
            pass++
            avg_diff_pass = avg_diff_pass + 1 / pass * (abs(second_max_return - max_return) - avg_diff_pass)
        } else {
            fail++
            avg_diff_fail = avg_diff_fail + 1 / fail * (abs(second_max_return - max_return) - avg_diff_fail)
            // break
        }
    }
    print("pass %: " + str(pass / (pass + fail)))
    print("avg diff of failures: " + str(avg_diff_fail))
    print("avg diff of passes: " + str(avg_diff_pass))

    // update the positions in the last generated tree and continue animation.
    update_pos_of_children(first_root)
    loop()
}

function do_finish_search_button() {
    /**
     * run finish_search on button click
     */
    if (root.depth === conf.max_tree_depth) {
        return
    }
    // finish the search by running the remainder iterations
    finish_search()
}

function finish_search() {
    // finish the search by running the remainding iterations
    num_it_left = conf.max_iterations - iteration_number
    for (let i = 0; i < num_it_left; i++) {
        finish_iteration()
    }
}

function do_step_selection_button() {
    /**
     * run do_step_selection on button click if the max tree depth has not been reached yet.
     */
     if (root.depth === conf.max_tree_depth) {
        return
    }

    // do a single step of selection
    current_node = do_step_selection(current_node)

    // highlight the newly selected node to indicate that it got selected.
    if (step_state === "selection") {
        current_node.add_color_layer([255, 255, 255])
    }

    // If the step_state turned to backprop, that means a node expansion occured. Therefore, 
    // the new children are unhidden and the trajectory's offspring width is updated.
    if (step_state === "backprop") {
        current_node.hide_children = false
        if (current_node.depth < conf.max_tree_depth) {
            update_offspring_leaf_nodes(current_node, current_node.num_children - 1)
        }
    }
}

function do_step_selection(node) {
    /**
     * run a selection step. Change the mode from slection to backprop when a leaf node is reached.
     */

    // if node depth === max tree depth, this is considered a leaf node therefore:
    // - the policy and value are evaluated.
    // - the step_state is switched to backprop
    if (node.depth === conf.max_tree_depth) {
        let policy_value = get_policy_and_value(node)
        node.policy = policy_value[0]
        backprop_value = policy_value[1]
        switch_step_state_to("backprop")
        return node
    }
    // if the current node is not expanded, this is a leaf node, expand it and switch the 
    // step_state to backprop.
    if (!node.is_expanded) {
        expand_children(node)
        let policy_value = get_policy_and_value(node)
        node.policy = policy_value[0]
        backprop_value = policy_value[1]
        switch_step_state_to("backprop")
        return node
        // else get the next best child
    } else {
        node = get_best_child(node)
        return node
    }
}

function do_step_backprop_button() {
    /**
     * run do_step_backpropagation on button click.
     */
    // remove the highlight that got added during the selection step
    if (current_node !== root) {
        current_node.remove_color_layer()
    }

    // do a backpropagation step, the node returned is the parent of the node given
    current_node = do_step_backpropagate(current_node)

    // whenever enough iterations have been completed, find the next root node.
    if (iteration_number === conf.max_iterations) {
        next_root(root)
    }
}

function do_step_backpropagate(node) {
    /**
     * Perform a backpropagation step.
     */

    // when the node is the root node, change to selection mode and increment the iteration number
    // since backpropagation reaching the root node marks the end of an iteration.

    new_node = step_backpropagate(node)

    // If the new_node is false, that means that the root node has been reached. In that case 
    // change the mode from "backprop" to "selection" and increment the iteration number
    if (new_node === false) {
        switch_step_state_to("selection")
        return node
    } else {
        return new_node
    }
}

function do_finish_iteration_button() {
    /**
     * Run finish_iteration on button click.
     */
    if (root.depth === conf.max_tree_depth) {
        return
    }
    finish_iteration()
}

function finish_iteration() {
    /** 
     * Finish the iteration by running the remaining selection and backpropagation steps
     */

    // resetting delay
    delay = 0

    // while in the selection state:
    while (step_state === "selection") {
        // select the best node
        current_node = do_step_selection(current_node)

        // add to the delay and highlight the new current node after that delay.
        delay += step_delay
        if (step_state === "selection") {
            node_add_color_layer_delayed(current_node, delay, [255, 255, 255])
        }

        // If the step_state turned to backprop, that means a node expansion occured. However the
        // created nodes are still hidden for the sake of a nice animation. Now, the 
        // offspring width is updated and the children are unhidden after some delay.
        if (step_state === "backprop") {
            // incrementing the delay 
            delay += step_delay * 2
            // unhide the children and update the offspring width after a delay
            node_unhide_children_delayed(current_node, delay)
            if (current_node.depth < conf.max_tree_depth) {
                update_offspring_leaf_nodes_delayed(current_node, delay)
            }
        }
    }

    delay += step_delay * 2

    // while in the backprop state
    while (step_state === "backprop") {

        // remove the highlight that got added during the selection step
        if (current_node !== root) {
            node_remove_color_layer_delayed(current_node, delay)
        }
        // do a backpropagation step, the node returned is the parent of the node given
        current_node = do_step_backpropagate(current_node)
        delay += step_delay
        // whenever enough iterations have been completed, find the next root node. Do this after a 
        // delay so that it only gets animated after the previous animations are done
        if (iteration_number === conf.max_iterations) {
            next_root_delayed(root, delay)
            break
        }
    }

}

function draw() {
    // make sure the right button is displayed according to the step_state
    if (step_state === "selection") {
        step_backprop_button.hide()
        step_selection_button.show()
    } else if (step_state === "backprop") {
        step_selection_button.hide()
        step_backprop_button.show()
    }

    // if mouse is being pressed, update the offset of all the nodes and redraw them.
    if (mouse_being_pressed) {
        updateNodeOffset()
        update_pos_of_children(first_root)
    }
    // show the tree on the screen
    background(0)
    show_tree(first_root)
}

function updateNodeOffset() {
    // Update the offset of all nodes position.

    // First calculate the change in mouse position.
    d_mouse_pos = createVector(mouseX, mouseY).sub(mouse_pos)

    // Then add the change in mouse position to the node offset
    node_offset.add(d_mouse_pos)

    // save the new mouse position
    mouse_pos = createVector(mouseX, mouseY)
}

function mousePressed() {
    // on mouse click, set mouse_being_pressed to true and save the mouse position.
    mouse_being_pressed = true
    mouse_pos = createVector(mouseX, mouseY)
}

function mouseReleased() {
    // on mouse release, set mouse_being_pressed to false 
    mouse_being_pressed = false
}