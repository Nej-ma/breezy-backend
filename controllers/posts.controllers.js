import Post from '../models/Post.js';
import Tag from '../models/Tag.js';

const publishPost = async (req, res) => {
    try {
        const { author, content, images, videos, tags, mentions, visibility } = req.body;
    
        // Validate required fields
        if (!author || !content) {
        return res.status(400).json({ message: 'Author and content are required.' });
        }
        

        // Create a new post
        const newPost = new Post({
        author,
        content,
        images: images || [],
        videos: videos || [],
        tags: tags || [],
        mentions: mentions || [],
        visibility: visibility || 'public'
        });
    
        // Save the post to the database
        await newPost.save();
    
        res.status(201).json({ message: 'Post published successfully', post: newPost });
    } catch (error) {
        console.error('Error publishing post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const getPosts = async (req, res) => {
    try {
        const posts = await Post.find({ isDeleted: false })
            .populate('author', 'username profilePicture')
            .sort({ createdAt: -1 });
    
        res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const getPost = async (req, res) => {
    try {
        const postId = req.params.id;
    
        const post = await Post.findById(postId)
            .populate('author', 'username profilePicture')
            .populate('tags', 'name')
            .populate('mentions', 'username profilePicture');
    
        if (!post || post.isDeleted) {
            return res.status(404).json({ message: 'Post not found.' });
        }
    
        res.status(200).json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { content, images, videos, tags, mentions, visibility } = req.body;

        // Dynamically build the update object
        if (!content && !images && !videos && !tags && !mentions && !visibility) {
            return res.status(400).json({ message: 'At least one field must be provided for update.' });
        }
        const updateFields = {};
        if (content !== undefined) updateFields.content = content;
        if (images !== undefined) updateFields.images = images;
        if (videos !== undefined) updateFields.videos = videos;
        if (tags !== undefined) updateFields.tags = tags;
        if (mentions !== undefined) updateFields.mentions = mentions;
        if (visibility !== undefined) updateFields.visibility = visibility;

        const updatedPost = await Post.findByIdAndUpdate(postId, updateFields, { new: true });

        if (!updatedPost || updatedPost.isDeleted) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        res.status(200).json({ message: 'Post updated successfully', post: updatedPost });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
    
        const deletedPost = await Post.findByIdAndUpdate(postId, { isDeleted: true }, { new: true });
        if (!deletedPost) {
            return res.status(404).json({ message: 'Post not found.' });
        }
        res.status(200).json({ message: 'Post deleted successfully', post: deletedPost });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export {
    publishPost,
    getPosts,
    getPost,
    updatePost,
    deletePost
};
