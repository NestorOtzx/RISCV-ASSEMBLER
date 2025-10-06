import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextEditor } from './text-editor';
import { By } from '@angular/platform-browser';

describe('TextEditor Component', () => {
  let fixture: ComponentFixture<TextEditor>;
  let component: TextEditor;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextEditor]
    }).compileComponents();

    fixture = TestBed.createComponent(TextEditor);
    component = fixture.componentInstance;
    fixture.detectChanges(); 
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });


  it('should initialize with lineCounter containing "1"', () => {
    expect(component.lineCounter).toEqual(['1']);
  });

  it('should update lineCounter when setContent is called', () => {
    component.setContent('hello\nworld');
    fixture.detectChanges();

    expect(component.lineCounter.length).toBe(2);
    expect(component.lineCounter[0]).toBe('1');
    expect(component.lineCounter[1]).toBe('2');
  });

  
});
