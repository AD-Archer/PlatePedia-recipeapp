async function toggleFollow(username, button) {
    try {
        const isFollowing = button.getAttribute('data-following') === 'true';
        const method = isFollowing ? 'DELETE' : 'POST';
        
        const response = await fetch(`/users/${username}/follow`, {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            const newIsFollowing = !isFollowing;
            button.setAttribute('data-following', newIsFollowing.toString());
            button.innerHTML = `
                <i class="bi bi-person${newIsFollowing ? '-check' : '-plus'}"></i>
                ${newIsFollowing ? 'Following' : 'Follow'}
            `;
            button.className = `btn btn${newIsFollowing ? '' : '-outline'}-primary btn-sm ms-2`;

            // Update follower count if it exists on the page
            const followerCountElement = document.getElementById('followerCount');
            if (followerCountElement) {
                let count = parseInt(followerCountElement.textContent);
                followerCountElement.textContent = newIsFollowing ? count + 1 : count - 1;
            }
        } else {
            alert(data.error || 'Error updating follow status');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating follow status');
    }
} 