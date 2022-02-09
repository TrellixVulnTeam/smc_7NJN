import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import Post from "../../models/posts";
import Reply from "../../models/replies";
import { PostService } from "../../post.service";
import * as moment from 'moment';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import User from "../../models/users";
import { UserService } from 'src/app/user.service';
import { Socket } from 'ngx-socket-io';

@Component({
  selector: 'app-wall',
  templateUrl: './wall.component.html',
  styleUrls: ['./wall.component.css']
})

export class WallComponent implements OnInit {

  posts: Post[]=[];
  replies: Reply[]=[];
  user!: User;
  moment: any = moment;
  displayName!: string;

  constructor(private postService: PostService,
    private el: ElementRef,
    private router: Router,
    private userService: UserService,
    private socket: Socket) { }

  ngOnInit() {
    const userId = localStorage.getItem("userId");
    if (userId) {
      this.userService.getUser(userId)
        .subscribe(user => {
          this.user = user;
          console.log("wall init user: ", this.user);
          if (this.user.realName != this.user.displayName) {
            this.displayName = `(${this.user.displayName})`;
          }
          this.postService.getPosts()
          .subscribe(
            posts => {
              console.log("posts:", posts);
              this.posts = posts;
            },
            err => {
              console.log("error getting posts");
              if (err instanceof HttpErrorResponse) {
                if (err.status === 401) {
                  this.router.navigate(["/"]);
                }
              }
            });
        });
    }

    this.socket.on('someoneTyping', (postId: string, socketId: string) => {
      //console.log(socketId,this.socket.ioSocket.id);
      //only show typing animation if typee someone other than current user
      if (socketId!=this.socket.ioSocket.id) {
        const temp="isTyping"+postId;
        const typingField = (<HTMLInputElement>document.getElementById(temp));
        typingField.style.display="block";
  
        setTimeout(() => {
          typingField.style.display="none";
        }, 10000);
      }
    });

    this.socket.on('postCollection', (postCollection: Post[]) => {
      console.log("got an updated post collection, ",postCollection);
      this.posts=postCollection;
    });
  }

  public post() {
    const postFld = (<HTMLInputElement>document.getElementById("newPost"));
    const postText = postFld.value;
    console.log(postFld);
    if (postFld) {
      postFld.value = "";
    }
    console.log(postText);
    let userId = localStorage.getItem("userId");
    if (userId) {
      this.postService.addPost(postText, userId)
        .subscribe((posts) => {
          this.posts = posts;
        });
      //.catch((error)=>console.log(error));
    }
  }

  public reply(parentId: string) {
    const replyField = (<HTMLInputElement>document.getElementById("replyText"+parentId));
    const replyText = replyField.value;
    let userId = localStorage.getItem("userId");
    if (userId) {
      console.log("adding new reply with text of: ",replyText);
      this.postService.addReply(replyText, userId, parentId)
        .subscribe((posts) => {
          this.posts = posts;
        });
      //.catch((error)=>console.log(error));
    }
  }

  public deletePost(id: string) {
    this.postService.deletePost(id)
      .subscribe((posts) => {
        this.posts = posts;
      });
  }

  postKeyup(postId: string) {
    this.socket.emit("someoneTyping",postId,this.socket.ioSocket.id);
  }
}