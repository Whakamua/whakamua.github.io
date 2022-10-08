class Node {
    constructor(parent, action) {
        /**
         * Initialize a node
         * @param {Node} parent parent node.
         * @param {int} action action responsible for transitioning parent to this node.
         */

        this.parent = parent // parent of this node
        this.children = [] // children of this node
        this.hide_children = true // children are by default hidden, which is used for animation.
        this.action = action // action responsible for transitioning parent to this node.
        this.num_children = 0 // number of children of this node
        this.num_visits = 0 // number of times this node got visited through mcts
        this.is_expanded = false // whether the node is expanded or not, a node gets expanded upon the creation of children.
        this.policy = [] // policy of this node, which will be assigned upon expanding the node.
        this.value = 0 // policy of this node, which will be assigned upon expanding the node.
        this.reward = abs(randomGaussian(conf.reward_mean, conf.reward_std)) // reward for reaching this node
        // PUCT value of this node, which is used by the parent to decide to chose this node or not
        // , will be updated throughout running MCTS.
        this.PUCT = 0

        // depth of this node in the tree
        if (this.parent) {
            this.depth = this.parent.depth + 1
        } else {
            this.depth = 0
        }

        // reward given to the first node that is created at a depth equal to 
        // the max tree depth, this is to make sure that there is one clear trajectory that should 
        // dominate, this makes it possible for MCTS to find the most optimal trajectory with less 
        // iterations.
        if (this.depth === conf.max_tree_depth) {
            this.reward += one_time_mega_reward
            one_time_mega_reward = 0
        }

        // return collected upon reaching this node
        if (this.parent) {
            this.return = this.parent.return + this.reward
        } else {
            this.return = this.reward
        }
        
        // keeping track of max and second max return, which is used for statistics
        if (this.return > max_return) {
            second_max_return = max_return
            max_return = this.return
        }

        // offspring_leaf_nodes indicates how many offsprings of this node are leaf nodes. It is 
        // initialized at 1 because this node itself is counted as a leaf node ammong the 
        // offsprings as well. This comes in handy when calculating the position of the tree in
        // update_pos_of_children()
        this.offspring_leaf_nodes = 1

        // initialize positon of Node. x is by default set to be the middle of the screen. Accurate
        // x positon is calculated using update_pos_of_children().
        // hash is an action trajectory starting from the root node.
        this.color = []
        if (this.parent) {
            this.position = createVector(width / 2, this.parent.position.y + conf.node_size * 2)
            this.hash = this.parent.hash + "." + str(this.action)
        } else {
            this.position = createVector(width / 2, 50)
            this.hash = "r"
        }
        this.set_default_color([232, 163, 79])
    }

    set_default_color(color) {
        // set the default color of the node, which is the color it has when no highlighting is applied
        this.default_color = color
        this.color[0] = color
    }
    
    add_color_layer(color) {
        // add a color layer, used for highlighting the node, the top most layer is always displayed
        this.color.push(color)
    }

    remove_color_layer() {
        // remove a color layer, used after highlighting the node, the top most layer is always displayed
        this.color.pop()

    }

    update_x_based_on_num_nodes_offset_from_parent(num_nodes_offset_from_parent) {
        // set the x position of the node based on how many node length units it got offset from the parent's x position
        this.position.x = this.parent.position.x + num_nodes_offset_from_parent * conf.node_size
    }

    draw_elipse() {
        // draw node elipses and print information inside
        // print elipse for the node using the topmost color in the color stack
        fill(this.color[this.color.length - 1])

        // set the color of the elipse border to be the topmost color in the color stack
        stroke(this.color[this.color.length - 1])
        if (this.return === max_return) {
            // if this node has the max return, highlight the border in green
            stroke([0, 255, 0])
        }
        ellipse(node_offset.x + this.position.x, node_offset.y + this.position.y, conf.node_size, conf.node_size)
    }

    print_info() {
        // print info inside the node

        // set the text font
        fill(0, 0, 0) // black filling
        stroke(0, 0, 0) // black stroke
        strokeWeight(0.2) // thickness of text
        textSize(conf.node_size / 10) // size of text
        let text_input = (
                "N: " + str(this.num_visits) + "\n"
            + "U: " + str(get_U(this)).slice(0, 4) + "\n"
            + "Q: " + str(get_Q(this)).slice(0, 4) + "\n"
            + "r: " + str(this.reward).slice(0, 4) + "\n"
            + "R: " + str(this.return).slice(0, 4) + "\n"
            + "PUCT " + str(get_PUCT(this)).slice(0, 4) + "\n"
        )
        if (this.parent) {
            text_input = text_input + "P: " + str(this.parent.policy[this.action]).slice(0, 5)
        }
        text(text_input, node_offset.x + this.position.x - conf.node_size / 4, node_offset.y + this.position.y - conf.node_size / 3)
                
    }

    draw_node() {
        /**
         * draw node and connecting lines to it's children.
         */

        // if the node should not be displayed, do not continue drawing. This is used for animation.
        if (this.parent && this.parent.hide_children) {
            return
        }

        // draw node elipses and print information inside
        this.draw_elipse()
        
        // print info inside the node
        this.print_info()

        // draw line to parent node

        // relative to the center of this node, the line should start to be drawn with this much offset relative to the center.
        // this is to make sure the line is drawn only outside the borders of the ellipse.
        var relative_x_offset
        var relative_y_offset

        // draw a line from the edge of this node's ellipse to the edge of teh parent's node elipse
        stroke(this.color[this.color.length - 1])
        strokeWeight(1)

        if (this.parent) {
            // if the node is right below the parent, a line straight up can be drawn.
            if (this.position.x === this.parent.position.x) {
                relative_x_offset = 0
                relative_y_offset = conf.node_size / 2
            } else {
                // find angle between this node and parent node
                // using angle = atan(opposite/adjacent)
                // here opposite is the difference in y between this and the parent node
                // and adjacent is the difference in x between this and the parent node
                let theta = Math.atan(Math.abs((this.position.y - this.parent.position.y) / (this.parent.position.x - (this.position.x))))

                // find x and y offset relative to the center of this node, so that the line can be drawn from the edge of the node:
                relative_x_offset = conf.node_size / 2 * Math.cos(theta)
                relative_y_offset = relative_x_offset * Math.tan(theta)

                // because x could be offset in the positive or negative direction, based 
                // on the parent's position being on the left or the right of this node.
                // a correction is added.
                let left_right_factor = (this.position.x - this.parent.position.x) / Math.abs((this.position.x - this.parent.position.x))
                relative_x_offset *= left_right_factor
            }

            // draw line taking into account:
            // - the position of the this node
            // - the relative x and y offset to make sure the line is not drawn over the ellipses
            // - the node offset, which is changed by dragging the screen around with the mouse.
            line(node_offset.x + this.position.x - relative_x_offset, node_offset.y + this.position.y - relative_y_offset, node_offset.x + this.parent.position.x + relative_x_offset, node_offset.y + this.parent.position.y + relative_y_offset)
        }
    }

}
